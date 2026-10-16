import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ambulance, AmbulanceStatus, AmbulanceType, Base, CallStatus, Coordinates, EmergencyCall, Incident, RouteInfo } from '../types';
import {
  getAmbulances,
  getBases,
  getPendingCalls,
  getIncidents,
  calculateRoute,
  finishDispatch,
  startShift,
  endShift,
  updateAmbulanceStatus,
  getErrorMessage,
  getTimeAgo,
  formatDistance,
  formatDuration
} from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../components/Toast';
import { PRIORITY_META, formatGender } from '../utils/calls';
import { fastestIndex, routeOptions, routeVia, trafficNote } from '../utils/routes';
import { PriorityLabel } from '../ui/PriorityLabel';
import { AmbulanceTypeIcon } from '../ui/AmbulanceTypeIcon';
import { BellIcon, CheckCircleIcon, DistanceIcon, NavigateIcon, ReportIcon, TimerIcon } from '../ui/icons';
import RouteNotes from '../components/RouteNotes';
import ReportSheet from './incidents/ReportSheet';
import { clearReports, flushReports, pendingReports } from './incidents/reportQueue';
import { useAuth } from '../auth/AuthContext';
import { AccountMenu } from '../components/AccountMenu';
import InstallBanner from './InstallBanner';
import { LANDSCAPE_PHONE, useMediaQuery } from '../ui/useMediaQuery';
import { formatNavDistance } from './navigation/instructions';
import { PickerEntry, pickerOrder } from './shift';
import { useShiftLocation } from './useShiftLocation';
import { googleMapsUrl } from './navigation/mapsLink';
import styles from './CrewApp.module.css';
import '../styles/index.css';

// Os mapas (MapLibre) são baixados à parte: a navegação só quando começa
const NavigationView = lazy(() => import('./navigation/NavigationView'));
const CrewMap = lazy(() => import('./CrewMap'));

// ?simular=1 faz o carro andar sozinho pela rota (testes e apresentação)
const SIMULATE = new URLSearchParams(window.location.search).has('simular');

const SNAPSHOT_KEY = 'samu:ultimos-dados';

interface Snapshot {
  ambulances: Ambulance[];
  calls: EmergencyCall[];
  incidents?: Incident[];
  savedAt: string;
}

// Últimos dados recebidos, para abrir o app mesmo sem sinal
function readSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSnapshot(snapshot: Snapshot | null) {
  try {
    if (snapshot) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    else localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // Sem armazenamento: o app só não abre offline
  }
}

// GPS do aparelho agora; sem permissão, sem sinal ou impreciso demais, null
function readGps(maxAccuracy = Infinity): Promise<Coordinates | null> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(coords.accuracy <= maxAccuracy ? { lat: coords.latitude, lng: coords.longitude } : null),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  });
}

// Posição atual para o relato fora da navegação (na simulação, a da viatura)
function currentPosition(fallback: Coordinates): Promise<Coordinates | null> {
  return SIMULATE ? Promise.resolve(fallback) : readGps();
}

// Precisão mínima para a posição do celular virar a da viatura no início do turno
const SHIFT_GPS_ACCURACY = 100;

// Selo de cada viatura na escolha do turno (o status interno "Indisponível" de quem está sem equipe confundia)
function PickerPill({ entry }: { entry: PickerEntry }) {
  if (entry.taken) return <span className={`${styles.pill} ${styles.pill_INDISPONIVEL}`}>Em turno · {entry.ambulance.driver?.name.split(' ')[0]}</span>;
  if (entry.ambulance.status === AmbulanceStatus.EM_ATENDIMENTO) {
    return <span className={`${styles.pill} ${styles.pill_EM_ATENDIMENTO}`}>Atendimento em andamento</span>;
  }
  return <span className={`${styles.pill} ${styles.pill_DISPONIVEL}`}>Livre</span>;
}

const TYPE_FILTERS: Array<{ value: AmbulanceType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: AmbulanceType.USA, label: 'USA' },
  { value: AmbulanceType.USB, label: 'USB' },
  { value: AmbulanceType.MOTOLANCIA, label: 'Motolância' }
];

const STATUS_LABEL: Record<AmbulanceStatus, string> = {
  [AmbulanceStatus.DISPONIVEL]: 'Disponível',
  [AmbulanceStatus.EM_ATENDIMENTO]: 'Em atendimento',
  [AmbulanceStatus.INDISPONIVEL]: 'Indisponível'
};

function StatusPill({ status }: { status: AmbulanceStatus }) {
  return <span className={`${styles.pill} ${styles[`pill_${status}`]}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export default function CrewApp() {
  const { me, signOut } = useAuth();
  const [snapshot] = useState(readSnapshot);
  const [typeFilter, setTypeFilter] = useState<AmbulanceType | 'ALL'>('ALL');
  const [ambulances, setAmbulances] = useState<Ambulance[]>(snapshot?.ambulances ?? []);
  const [calls, setCalls] = useState<EmergencyCall[]>(snapshot?.calls ?? []);
  const [incidents, setIncidents] = useState<Incident[]>(snapshot?.incidents ?? []);
  const [pending, setPending] = useState(pendingReports);
  const [reporting, setReporting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(snapshot?.savedAt ?? null);
  const [connection, setConnection] = useState<'connecting' | 'online' | 'error'>('connecting');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  // Rota escolhida entre a principal e as alternativas (a navegação começa por ela)
  const [routeIndex, setRouteIndex] = useState(0);
  const routeChoices = useMemo(() => routeOptions(route), [route]);
  const chosenRoute = routeChoices[routeIndex] ?? route;
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isNewDispatch, setIsNewDispatch] = useState(false);
  const [navigating, setNavigating] = useState(false);
  // Escolha da viatura: onde o celular está e o nome das bases
  const [here, setHere] = useState<Coordinates | null>(null);
  const [bases, setBases] = useState<Base[]>([]);
  // Celular deitado: informações e botões numa coluna à esquerda, mapa à direita na altura toda
  const landscape = useMediaQuery(LANDSCAPE_PHONE);
  const lastCallId = useRef<string | null | undefined>(undefined);
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;
  const toast = useToast();

  // Relatos feitos sem sinal saem assim que o servidor responde
  const flushQueue = useCallback(async () => {
    if (!pendingReports()) return;
    const sent = await flushReports();
    setPending(pendingReports());
    if (sent) toast(sent === 1 ? 'O relato feito sem sinal foi enviado.' : `${sent} relatos feitos sem sinal foram enviados.`, 'success');
  }, [toast]);

  const loadData = useCallback(async () => {
    try {
      const [ambData, callData, incidentData] = await Promise.all([
        getAmbulances(),
        getPendingCalls(),
        // Sem a lista de ocorrências o app continua; fica a última recebida
        getIncidents().catch(() => incidentsRef.current)
      ]);
      const now = new Date().toISOString();
      setAmbulances(ambData);
      setCalls(callData);
      setIncidents(incidentData);
      setSavedAt(now);
      setConnection('online');
      saveSnapshot({ ambulances: ambData, calls: callData, incidents: incidentData, savedAt: now });
      flushQueue();
      return true;
    } catch {
      setConnection('error');
      return false;
    }
  }, [flushQueue]);

  // A equipe precisa saber rápido de um despacho novo
  usePolling(loadData, 10000, 5000);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      flushQueue();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [flushQueue]);

  // A viatura do motorista é a que está no turno dele
  const ambulance = ambulances.find(a => a.driver?.id === me.id);
  const activeCall = ambulance
    ? calls.find(c => c.status === CallStatus.EM_ATENDIMENTO && c.ambulance_id === ambulance.id)
    : undefined;

  // O celular é o GPS da viatura durante o turno (na navegação quem manda é ela; na simulação, a viatura anda sozinha)
  useShiftLocation(ambulance?.id, !navigating && !SIMULATE);

  // Sem turno: localiza o celular e as bases para ordenar e descrever as viaturas
  const choosing = !ambulance;
  useEffect(() => {
    if (!choosing) return;
    let cancelled = false;
    readGps(SHIFT_GPS_ACCURACY).then(position => { if (!cancelled) setHere(position); });
    getBases().then(result => { if (!cancelled) setBases(result); }).catch(() => { /* sem bases: sem o nome */ });
    return () => { cancelled = true; };
  }, [choosing]);

  // Trocou de viatura: o chamado que ela já tiver não conta como "novo despacho"
  useEffect(() => {
    lastCallId.current = undefined;
  }, [ambulance?.id]);

  // Avisa (vibração + destaque) quando chega um chamado diferente do último visto
  useEffect(() => {
    if (!ambulance) return;
    const currentId = activeCall?.id ?? null;

    if (lastCallId.current !== undefined && currentId && currentId !== lastCallId.current) {
      setIsNewDispatch(true);
      navigator.vibrate?.([300, 150, 300, 150, 300]);
      toast('Novo despacho recebido', 'info');
    }
    if (!currentId) setIsNewDispatch(false);

    lastCallId.current = currentId;
  }, [activeCall?.id, ambulance, toast]);

  // Chamado ou viatura novos: começa do zero
  useEffect(() => {
    setRoute(null);
    setConfirmingFinish(false);
    setNavigating(false);
  }, [activeCall?.id, ambulance?.id]);

  // Ocorrências com área: quando mudam, a prévia da rota é refeita (o servidor responde do cache se nada mudou no caminho)
  const incidentsKey = useMemo(() => incidents
    .filter(incident => incident.radius > 0)
    .map(incident => `${incident.id}:${incident.effect}:${incident.radius}`)
    .sort()
    .join('|'), [incidents]);

  // Rota da viatura até o chamado atual (na navegação, quem recalcula é ela)
  useEffect(() => {
    if (!activeCall || !ambulance || navigating) return;

    let cancelled = false;
    calculateRoute(ambulance.location, activeCall.location, { alternatives: true })
      .then(result => {
        if (cancelled) return;
        setRoute(result);
        setRouteIndex(0);
      })
      .catch(() => { /* sem rota: o mapa mostra só os dois pontos */ });

    return () => { cancelled = true; };
  }, [activeCall?.id, ambulance?.id, incidentsKey, navigating]);

  const handleStartShift = async (target: Ambulance) => {
    setBusy(true);
    try {
      await startShift(target.id, here ?? (await readGps(SHIFT_GPS_ACCURACY)) ?? undefined);
      toast(
        target.status === AmbulanceStatus.EM_ATENDIMENTO
          ? `Turno iniciado na ${target.code}. Você assumiu o atendimento em andamento.`
          : `Turno iniciado na ${target.code}. A central já vê você disponível.`,
        'success'
      );
      await loadData();
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível iniciar o turno.'), 'error');
      await loadData();
    } finally {
      setBusy(false);
    }
  };

  const handleEndShift = async () => {
    setBusy(true);
    try {
      await endShift();
      toast('Turno encerrado.', 'info');
      await loadData();
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível encerrar o turno.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Sair apaga os dados guardados para uso offline (incluem informações de pacientes)
  const handleSignOut = async () => {
    saveSnapshot(null);
    clearReports();
    await signOut();
  };

  const handleFinish = async () => {
    if (!activeCall) return;
    setBusy(true);
    try {
      await finishDispatch(activeCall.id);
      toast('Atendimento finalizado. Viatura disponível.', 'success');
      await loadData();
    } catch (error) {
      toast(getErrorMessage(error, 'Erro ao finalizar atendimento.'), 'error');
    } finally {
      setBusy(false);
      setConfirmingFinish(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!ambulance) return;
    const next = ambulance.status === AmbulanceStatus.DISPONIVEL ? AmbulanceStatus.INDISPONIVEL : AmbulanceStatus.DISPONIVEL;
    setBusy(true);
    try {
      await updateAmbulanceStatus(ambulance.id, next);
      toast(next === AmbulanceStatus.DISPONIVEL ? 'Viatura disponível para despacho' : 'Viatura marcada como indisponível', 'info');
      await loadData();
    } catch (error) {
      toast(getErrorMessage(error, 'Erro ao atualizar status.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const hasData = ambulances.length > 0;
  const offlineBanner = hasData && (!online || connection === 'error') && (
    <div className={styles.offline} role="status">
      Sem conexão. Mostrando os dados das{' '}
      {savedAt ? new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}.
      {pending > 0 && ` ${pending === 1 ? '1 relato aguarda' : `${pending} relatos aguardam`} sinal.`}
    </div>
  );

  // Carregando pela primeira vez
  if (!hasData) {
    return (
      <div className={styles.shell}>
        <div className={styles.centered}>
          {connection === 'error' ? (
            <>
              <p className={styles.centeredTitle}>Sem conexão com o servidor</p>
              <p className={styles.muted}>Tentando novamente…</p>
              <button className={styles.secondaryButton} onClick={loadData}>Tentar agora</button>
            </>
          ) : (
            <>
              <div className={styles.spinner} />
              <p className={styles.muted}>Conectando ao servidor…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Sem turno: escolher a viatura de hoje
  if (!ambulance) {
    const entries = pickerOrder(ambulances.filter(a => typeFilter === 'ALL' || a.type === typeFilter), here);
    const baseName = (id: string) => bases.find(base => base.id === id)?.name;
    return (
      <div className={styles.shell}>
        {offlineBanner}
        <main className={styles.picker}>
          <div className={styles.pickerTop}>
            <p className={styles.muted}>Olá, {me.fullName.split(' ')[0]}</p>
            <AccountMenu onSignOut={handleSignOut} />
          </div>
          <h1>Iniciar turno</h1>
          <p className={styles.muted}>Escolha a viatura do seu plantão. A central passa a ver seu nome nela, e ela passa a usar a localização deste celular.</p>

          <div className={styles.typeFilters} role="tablist" aria-label="Tipo de viatura">
            {TYPE_FILTERS.map(filter => (
              <button
                key={filter.value}
                role="tab"
                aria-selected={typeFilter === filter.value}
                className={`${styles.typeChip} ${typeFilter === filter.value ? styles.typeChipActive : ''}`}
                onClick={() => setTypeFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {!entries.some(entry => !entry.taken) && (
            <p className={styles.muted}>Nenhuma viatura livre deste tipo agora.</p>
          )}
          <ul className={styles.pickerList}>
            {entries.map(entry => {
              const { ambulance: a } = entry;
              const where = [baseName(a.baseId), entry.distance !== null && `a ${formatNavDistance(entry.distance)} de você`]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={a.id}>
                  <button
                    className={`${styles.pickerItem} ${entry.taken ? styles.pickerItemTaken : ''}`}
                    disabled={busy || entry.taken}
                    onClick={() => handleStartShift(a)}
                  >
                    <span className={styles.pickerCode}><AmbulanceTypeIcon type={a.type} /> {a.code}</span>
                    {where && <span className={styles.pickerWhere}>{where}</span>}
                    <span className={styles.muted}>{a.type} · equipe: {a.crew.medic}{a.crew.nurse ? `, ${a.crew.nurse}` : ''}</span>
                    <PickerPill entry={entry} />
                    {!entry.taken && a.status === AmbulanceStatus.EM_ATENDIMENTO && (
                      <span className={styles.muted}>Ao escolher, você assume o chamado em andamento.</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </main>
      </div>
    );
  }

  const reportButton = (
    <button className={styles.reportButton} onClick={() => setReporting(true)}><ReportIcon /> Reportar</button>
  );
  const reportSheet = reporting && (
    <ReportSheet
      getPosition={() => currentPosition(ambulance.location)}
      onClose={() => setReporting(false)}
      onReported={() => {
        setPending(pendingReports());
        loadData();
      }}
    />
  );

  const meta = activeCall ? PRIORITY_META[activeCall.priority] : undefined;
  const gender = activeCall ? formatGender(activeCall.patientInfo.gender) : null;

  if (navigating && activeCall && chosenRoute) {
    return (
      <Suspense fallback={<div className={styles.shell}><div className={styles.centered}><div className={styles.spinner} /></div></div>}>
        <NavigationView
          ambulance={ambulance}
          call={activeCall}
          initialRoute={chosenRoute}
          incidents={incidents}
          simulate={SIMULATE}
          onExit={() => setNavigating(false)}
          onFinish={handleFinish}
          onIncidentsChange={loadData}
        />
      </Suspense>
    );
  }

  const header = (
    <header className={styles.header}>
      <div>
        <p className={styles.headerCode}><AmbulanceTypeIcon type={ambulance.type} /> {ambulance.code} <span>{ambulance.type} · {me.fullName.split(' ')[0]}</span></p>
        <StatusPill status={ambulance.status} />
      </div>
      {/* Durante um atendimento não dá para encerrar o turno nem sair */}
      <AccountMenu
        onSignOut={handleSignOut}
        shift={{ code: ambulance.code, onEnd: handleEndShift }}
        blockedReason={activeCall ? 'Finalize o atendimento antes de encerrar o turno ou sair.' : undefined}
      />
    </header>
  );

  // O mesmo conteúdo serve aos dois arranjos: em pé (coluna única) e deitado (coluna + mapa ao lado)
  let info: React.ReactNode;
  let details: React.ReactNode = null;
  let mapView: React.ReactNode;
  let actionBar: React.ReactNode;

  if (activeCall && meta) {
    info = (
      <section
        className={`${styles.callCard} ${isNewDispatch ? styles.callCardNew : ''}`}
        style={{ '--priority-color': meta.color } as React.CSSProperties}
        onClick={() => setIsNewDispatch(false)}
      >
        {isNewDispatch && <p className={styles.newBadge}><BellIcon /> Novo despacho</p>}
        <p className={styles.priority}><PriorityLabel priority={activeCall.priority} /></p>
        <h1 className={styles.address}>{activeCall.address}</h1>
        <p className={styles.description}>{activeCall.description}</p>
        <p className={styles.patient}>
          {[activeCall.patientInfo.age && `${activeCall.patientInfo.age} anos`, gender, `aberto ${getTimeAgo(activeCall.timestamp)}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </section>
    );

    mapView = (
      <div className={styles.mapWrap}>
        <Suspense fallback={null}>
          <CrewMap
            ambulance={ambulance}
            call={activeCall}
            routes={routeChoices.map(option => option.geometry)}
            selectedRoute={routeIndex}
            onSelectRoute={setRouteIndex}
            incidents={incidents}
          />
        </Suspense>
        {reportButton}
      </div>
    );

    details = (
      <>
        {routeChoices.length > 1 ? (
          // Como no Waze: escolhe o caminho antes de sair (no mapa, a escolhida fica azul)
          <div className={styles.routeChoices} role="radiogroup" aria-label="Escolha a rota">
            {routeChoices.map((option, index) => {
              const via = routeVia(option);
              const traffic = trafficNote(option);
              return (
                <button
                  key={index}
                  role="radio"
                  aria-checked={index === routeIndex}
                  className={`${styles.routeChoice} ${index === routeIndex ? styles.routeChoiceSelected : ''}`}
                  onClick={() => setRouteIndex(index)}
                >
                  <strong>{formatDuration(option.duration)}</strong>
                  <span>{formatDistance(option.distance)}{traffic && ` · ${traffic}`}{via && ` · via ${via}`}</span>
                  {index === fastestIndex(routeChoices) && <em>Mais rápida</em>}
                </button>
              );
            })}
          </div>
        ) : chosenRoute && (
          <div className={styles.routeInfo}>
            <span><DistanceIcon /> <strong>{formatDistance(chosenRoute.distance)}</strong></span>
            <span><TimerIcon /> <strong>{formatDuration(chosenRoute.duration)}</strong></span>
            {trafficNote(chosenRoute) && <span>{trafficNote(chosenRoute)}</span>}
          </div>
        )}
        {chosenRoute && <RouteNotes route={chosenRoute} />}
      </>
    );

    actionBar = (
      <nav className={styles.actionBar}>
        <div className={styles.navRow}>
          <button
            className={styles.navigate}
            disabled={!chosenRoute}
            onClick={() => {
              setIsNewDispatch(false);
              setNavigating(true);
            }}
          >
            {chosenRoute ? <><NavigateIcon /> Iniciar navegação</> : 'Calculando rota…'}
          </button>
          {chosenRoute && (
            <a
              className={styles.mapsLink}
              href={googleMapsUrl(ambulance.location, activeCall.location, chosenRoute.geometry, chosenRoute.waypoints)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Maps
            </a>
          )}
        </div>

        {confirmingFinish ? (
          <div className={styles.navRow}>
            <button className={styles.finishConfirm} disabled={busy} onClick={handleFinish}>
              {busy ? 'Finalizando…' : 'Confirmar finalização'}
            </button>
            <button className={styles.secondaryButton} disabled={busy} onClick={() => setConfirmingFinish(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className={styles.finish} onClick={() => setConfirmingFinish(true)}>
            <CheckCircleIcon /> Finalizar atendimento
          </button>
        )}
      </nav>
    );
  } else {
    info = (
      <section className={styles.idle}>
        {ambulance.status === AmbulanceStatus.DISPONIVEL ? (
          <>
            <p className={styles.idleTitle}>Aguardando chamado</p>
            <p className={styles.muted}>Você será avisado assim que a central despachar esta viatura.</p>
          </>
        ) : (
          <>
            <p className={styles.idleTitle}>{STATUS_LABEL[ambulance.status]}</p>
            <p className={styles.muted}>A central não vai despachar esta viatura enquanto ela estiver fora de serviço.</p>
          </>
        )}
      </section>
    );

    mapView = (
      <div className={styles.mapWrap}>
        <Suspense fallback={null}>
          <CrewMap ambulance={ambulance} incidents={incidents} />
        </Suspense>
        {reportButton}
      </div>
    );

    actionBar = (
      <nav className={styles.actionBar}>
        <button
          className={ambulance.status === AmbulanceStatus.DISPONIVEL ? styles.secondaryButton : styles.finish}
          disabled={busy}
          onClick={handleToggleAvailability}
        >
          {ambulance.status === AmbulanceStatus.DISPONIVEL ? 'Ficar indisponível' : 'Ficar disponível'}
        </button>
      </nav>
    );
  }

  if (landscape) {
    return (
      <div className={`${styles.shell} ${styles.shellLandscape}`}>
        <div className={styles.sideColumn}>
          {header}
          {offlineBanner}
          <InstallBanner />
          <main className={styles.main}>
            {info}
            {details}
          </main>
          {actionBar}
        </div>
        {mapView}
        {reportSheet}
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {header}
      {offlineBanner}
      <InstallBanner />
      {reportSheet}

      <main className={styles.main}>
        {info}
        {mapView}
        {details}
      </main>
      {actionBar}
    </div>
  );
}
