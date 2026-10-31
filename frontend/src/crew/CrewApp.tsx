import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ambulance, AmbulanceStatus, AmbulanceType, Base, CallOutcome, CallStatus, Coordinates, EmergencyCall, Hospital, Incident, RouteInfo } from '../types';
import {
  getAmbulances,
  getBases,
  getPendingCalls,
  getIncidents,
  getHospitals,
  calculateRoute,
  finishDispatch,
  startShift,
  endShift,
  markCallSeen,
  updateAmbulanceStatus,
  getErrorMessage,
  getTimeAgo,
  formatDistance,
  formatDuration
} from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../components/Toast';
import { STAGE_META, callStage, elapsedLabel, formatGender, needsOutcome, riskVars, timeline } from '../utils/calls';
import { useNow } from '../hooks/useNow';
import { OutcomeChoice } from '../ui/OutcomeChoice';
import { AMBULANCE_STATUS_LABEL, AMBULANCE_TYPE_LABEL } from '../utils/ambulances';
import { fastestIndex, routeOptions, routeVia, trafficNote } from '../utils/routes';
import { PriorityLabel } from '../ui/PriorityLabel';
import { signalsText } from '../utils/triage';
import { AmbulanceTypeIcon } from '../ui/AmbulanceTypeIcon';
import { BellIcon, CheckCircleIcon, DistanceIcon, HospitalIcon, LocationOffIcon, NavigateIcon, ReportIcon, TimerIcon } from '../ui/icons';
import { useWakeLock } from '../ui/useWakeLock';
import DispatchAlert from './DispatchAlert';
import { useDispatchPush } from './useDispatchPush';
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
import { wazeUrl } from './navigation/mapsLink';
import { callDestination, crewPhase } from './destination';
import HospitalSheet from './HospitalSheet';
import { Spinner } from '../ui/Spinner';
import { SlidingThumb } from '../ui/SlidingThumb';
import { styles } from './CrewApp.styles';

// Os mapas (MapLibre) são baixados à parte: a navegação só quando começa
const NavigationView = lazy(() => import('./navigation/NavigationView'));
const CrewMap = lazy(() => import('./CrewMap'));

// ?simular=1 faz o carro andar sozinho pela rota, só no desenvolvimento (npm run dev): na versão
// publicada a posição falsa iria para a central como se fosse da viatura de verdade
const SIMULATE = import.meta.env.DEV && new URLSearchParams(window.location.search).has('simular');

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
  if (entry.taken) return <span className={styles.pill_INDISPONIVEL}>Em turno · {entry.ambulance.driver?.name.split(' ')[0]}</span>;
  if (entry.ambulance.status === AmbulanceStatus.EM_ATENDIMENTO) {
    return <span className={styles.pill_EM_ATENDIMENTO}>Atendimento em andamento</span>;
  }
  return <span className={styles.pill_DISPONIVEL}>Livre</span>;
}

const TYPE_FILTERS: Array<{ value: AmbulanceType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  ...[AmbulanceType.USA, AmbulanceType.USB, AmbulanceType.MOTOLANCIA].map(value => ({ value, label: AMBULANCE_TYPE_LABEL[value] }))
];

function StatusPill({ status }: { status: AmbulanceStatus }) {
  return <span className={styles[`pill_${status}`]}>{AMBULANCE_STATUS_LABEL[status] ?? status}</span>;
}

export default function CrewApp() {
  const { me, signOut } = useAuth();
  const [snapshot] = useState(readSnapshot);
  const [typeFilter, setTypeFilter] = useState<AmbulanceType | 'ALL'>('ALL');
  const [ambulances, setAmbulances] = useState<Ambulance[]>(snapshot?.ambulances ?? []);
  const [calls, setCalls] = useState<EmergencyCall[]>(snapshot?.calls ?? []);
  const [incidents, setIncidents] = useState<Incident[]>(snapshot?.incidents ?? []);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  // Hospitais quase não mudam: carregam uma vez (de novo só se a tentativa falhou)
  const hospitalsLoaded = useRef(false);
  const [choosingHospital, setChoosingHospital] = useState(false);
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
  // Despacho que a equipe já confirmou neste aparelho (o servidor grava; a próxima leitura traz)
  const [ackedCallId, setAckedCallId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  // Escolha da viatura: onde o celular está e o nome das bases
  const [here, setHere] = useState<Coordinates | null>(null);
  const [bases, setBases] = useState<Base[]>([]);
  // Celular deitado: informações e botões numa coluna à esquerda, mapa à direita na altura toda
  const landscape = useMediaQuery(LANDSCAPE_PHONE);
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
      if (!hospitalsLoaded.current) {
        hospitalsLoaded.current = true;
        getHospitals().then(setHospitals).catch(() => { hospitalsLoaded.current = false; });
      }
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

  // Para onde ir agora: o chamado e, depois de chegar ao local, o hospital escolhido (pela central ou aqui)
  const destination = useMemo(() => (activeCall ? callDestination(activeCall, hospitals) : undefined), [activeCall, hospitals]);
  const destinationKey = destination ? `${destination.kind}:${destination.id}` : '';
  const stage = activeCall ? callStage(activeCall) : null;
  const phase = activeCall ? crewPhase(activeCall, hospitals) : null;
  // No local sem hospital o destino seria o próprio local, e no hospital já se chegou: não há rota a seguir
  const needsRoute = phase === 'a_caminho' || phase === 'levando_ao_hospital';
  const now = useNow(30_000, !!activeCall);

  // O celular é o GPS da viatura durante o turno (na navegação quem manda é ela; na simulação, a viatura anda sozinha).
  // Em atendimento manda mais vezes: é a posição que marca as etapas (saiu, chegou, hospital)
  const gps = useShiftLocation(ambulance?.id, !navigating && !SIMULATE, !!activeCall);

  // Sem turno: localiza o celular e as bases para ordenar e descrever as viaturas
  const choosing = !ambulance;
  useEffect(() => {
    if (!choosing) return;
    let cancelled = false;
    readGps(SHIFT_GPS_ACCURACY).then(position => { if (!cancelled) setHere(position); });
    getBases().then(result => { if (!cancelled) setBases(result); }).catch(() => { /* sem bases: sem o nome */ });
    return () => { cancelled = true; };
  }, [choosing]);

  // Tela acesa durante o turno: com ela apagada o app para de consultar o servidor
  useWakeLock(!!ambulance);
  const push = useDispatchPush(!!ambulance);

  // Despacho que ninguém da equipe confirmou ainda: alarme em tela cheia (também depois de recarregar)
  const needsAck = !!activeCall && !activeCall.times?.crewSeen && ackedCallId !== activeCall.id;
  const handleAck = (navigate = false) => {
    if (!activeCall) return;
    setAckedCallId(activeCall.id);
    // "Ciente e navegar": o alarme já sai direto para a navegação, com a rota da prévia
    if (navigate) setNavigating(true);
    markCallSeen(activeCall.id)
      .then(() => loadData())
      .catch(() => toast('Sem conexão: a central ainda não sabe que você viu o despacho.', 'error'));
  };

  // Chamado, viatura ou destino novos (chegou ao local e há hospital): começa do zero.
  // Exceção: a central trocou o hospital (do mesmo chamado) com a navegação aberta — ela segue para o novo destino.
  const previousTarget = useRef({ callId: activeCall?.id, ambulanceId: ambulance?.id, destinationKey });
  const ownHospitalChoice = useRef(false);
  useEffect(() => {
    const previous = previousTarget.current;
    previousTarget.current = { callId: activeCall?.id, ambulanceId: ambulance?.id, destinationKey };
    const hospitalChanged =
      previous.callId === activeCall?.id &&
      previous.ambulanceId === ambulance?.id &&
      previous.destinationKey.startsWith('hospital:') &&
      destinationKey.startsWith('hospital:') &&
      previous.destinationKey !== destinationKey;
    if (hospitalChanged && navigating) return;
    // Fora da navegação, a troca feita pela central aparece num aviso (a feita aqui já tem o dela)
    if (hospitalChanged && !ownHospitalChoice.current && destination) toast(`Destino mudou: ${destination.label}`, 'info');
    ownHospitalChoice.current = false;
    setRoute(null);
    setConfirmingFinish(false);
    setNavigating(false);
  }, [activeCall?.id, ambulance?.id, destinationKey]);

  // Ocorrências com área: quando mudam, a prévia da rota é refeita (o servidor responde do cache se nada mudou no caminho)
  const incidentsKey = useMemo(() => incidents
    .filter(incident => incident.radius > 0)
    .map(incident => `${incident.id}:${incident.effect}:${incident.radius}`)
    .sort()
    .join('|'), [incidents]);

  // Rota da viatura até o destino atual (na navegação, quem recalcula é ela)
  useEffect(() => {
    if (!destination || !ambulance || navigating) return;
    if (!needsRoute) {
      setRoute(null);
      return;
    }

    let cancelled = false;
    calculateRoute(ambulance.location, destination.location, { alternatives: true })
      .then(result => {
        if (cancelled) return;
        setRoute(result);
        setRouteIndex(0);
      })
      .catch(() => { /* sem rota: o mapa mostra só os dois pontos */ });

    return () => { cancelled = true; };
  }, [destinationKey, ambulance?.id, incidentsKey, navigating, needsRoute]);

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
    await push.disable();
    await signOut();
  };

  const handleFinish = async (outcome?: CallOutcome) => {
    if (!activeCall) return;
    setBusy(true);
    try {
      await finishDispatch(activeCall.id, outcome);
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
  const clock = (at: number) => new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // GPS com problema: o motorista fica sabendo que a central o vê parado (as etapas e a distância vêm dele)
  const gpsBanner = gps.problem && (
    <div className={styles.gpsBanner} role="alert">
      <p>
        <LocationOffIcon />{' '}
        {gps.problem === 'negado' ? 'Localização desligada' : 'GPS sem sinal'}:{' '}
        {gps.hadFix ? `a central vê a viatura parada desde ${clock(gps.since)}.` : 'a central não recebe a posição da viatura.'}
      </p>
      <button type="button" onClick={gps.retry}>
        {gps.problem === 'negado' ? 'Ativar localização' : 'Tentar de novo'}
      </button>
    </div>
  );
  const connectionBanner = hasData && (!online || connection === 'error') && (
    <div className={styles.offline} role="status">
      Sem conexão. Mostrando os dados das{' '}
      {savedAt ? new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}.
      {pending > 0 && ` ${pending === 1 ? '1 relato aguarda' : `${pending} relatos aguardam`} sinal.`}
    </div>
  );

  const offlineBanner = (connectionBanner || gpsBanner) && <>{connectionBanner}{gpsBanner}</>;

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
              <Spinner size={40} label="Conectando" />
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

          <div className={`${styles.typeFilters} slide-group`} role="tablist" aria-label="Tipo de viatura">
            <SlidingThumb variant="ink" watch={typeFilter} />
            {TYPE_FILTERS.map(filter => (
              <button
                key={filter.value}
                role="tab"
                aria-selected={typeFilter === filter.value}
                className={styles.typeChip}
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
                    className={entry.taken ? styles.pickerItemTaken : styles.pickerItem}
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
  const hospitalSheet = choosingHospital && activeCall && (
    <HospitalSheet
      callId={activeCall.id}
      hospitals={hospitals}
      current={activeCall.hospitalId}
      from={ambulance.location}
      onClose={() => setChoosingHospital(false)}
      onChosen={() => {
        ownHospitalChoice.current = true;
        loadData();
      }}
    />
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

  const gender = activeCall ? formatGender(activeCall.patientInfo.gender) : null;

  if (navigating && activeCall && destination && chosenRoute) {
    return (
      <Suspense fallback={<div className={styles.shell}><div className={styles.centered}><Spinner size={40} /></div></div>}>
        <NavigationView
          ambulance={ambulance}
          destination={destination}
          priority={activeCall.priority}
          reference={activeCall.reference}
          initialRoute={chosenRoute}
          incidents={incidents}
          simulate={SIMULATE}
          onExit={() => setNavigating(false)}
          onIncidentsChange={loadData}
        />
      </Suspense>
    );
  }

  const header = (
    <header className={styles.header}>
      <div>
        <p className={styles.headerCode}><AmbulanceTypeIcon type={ambulance.type} /> {ambulance.code} <span>{AMBULANCE_TYPE_LABEL[ambulance.type] ?? ambulance.type} · {me.fullName.split(' ')[0]}</span></p>
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

  if (activeCall && destination) {
    const hospital = hospitals.find(item => item.id === activeCall.hospitalId);
    const steps = timeline(activeCall);
    // Já no local e sem hospital: escolher o hospital é o próximo passo, e o botão vai para a barra do polegar
    const needsHospital = phase === 'no_local_sem_hospital' && hospitals.length > 0;
    // Finalizar só é o principal quando não resta caminho: no hospital, ou no local sem hospital para escolher
    const finishIsMain = phase === 'no_hospital' || (phase === 'no_local_sem_hospital' && hospitals.length === 0);
    info = (
      <section className={styles.callCard} style={riskVars(activeCall.priority)}>
        <p className={styles.priority}><PriorityLabel priority={activeCall.priority} /></p>
        <h1 className={styles.address}>{activeCall.address}</h1>
        {activeCall.reference && <p className={styles.reference}>Referência: {activeCall.reference}</p>}
        <p className={styles.description}>{activeCall.description}</p>
        {activeCall.triage?.signals.length ? <p className={styles.signals}>Sinais: {signalsText(activeCall.triage.signals)}</p> : null}
        <p className={styles.patient}>
          {[activeCall.patientInfo.age && `${activeCall.patientInfo.age} anos`, gender, `aberto ${getTimeAgo(activeCall.timestamp)}`]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {/* Etapa marcada sozinha pelo GPS: a equipe só confere */}
        <div className={styles.progress} onClick={event => event.stopPropagation()}>
          {stage && (
            <p className={styles.stage}>
              {STAGE_META[stage.stage].label} · {elapsedLabel(stage.since, now)}
            </p>
          )}
          {steps.length > 0 && <p className={styles.timeline}>{steps.map(step => `${step.label} ${step.time}`).join(' · ')}</p>}
          <div className={styles.hospitalRow}>
            <span>Hospital: <strong>{hospital?.shortName ?? 'a definir'}</strong></span>
            {!activeCall.times?.atHospital && hospitals.length > 0 && !needsHospital && (
              <button className={styles.hospitalButton} onClick={() => setChoosingHospital(true)}>
                {hospital ? 'Trocar' : 'Escolher'}
              </button>
            )}
          </div>
        </div>
      </section>
    );

    mapView = (
      <div className={styles.mapWrap}>
        <Suspense fallback={null}>
          <CrewMap
            ambulance={ambulance}
            destination={destination}
            routes={routeChoices.map(option => option.geometry)}
            selectedRoute={routeIndex}
            onSelectRoute={setRouteIndex}
            incidents={incidents}
          />
        </Suspense>
        {reportButton}
      </div>
    );

    details = chosenRoute && (
      <>
        <div className={styles.routeInfo}>
          <span><DistanceIcon /> <strong>{formatDistance(chosenRoute.distance)}</strong></span>
          <span><TimerIcon /> <strong>{formatDuration(chosenRoute.duration)}</strong></span>
          {trafficNote(chosenRoute) && <span>{trafficNote(chosenRoute)}</span>}
        </div>
        <RouteNotes route={chosenRoute} />
      </>
    );

    actionBar = (
      <nav className={styles.actionBar}>
        {needsHospital && (
          <button className={styles.chooseHospital} onClick={() => setChoosingHospital(true)}>
            <HospitalIcon /> Escolher hospital
          </button>
        )}
        {needsRoute && routeChoices.length > 1 && (
          // Como no Waze: escolhe o caminho antes de sair, logo acima de "Iniciar navegação" (no mapa, a escolhida fica azul)
          <div className={styles.routeChoices} role="radiogroup" aria-label="Escolha a rota">
            {routeChoices.map((option, index) => {
              const via = routeVia(option);
              return (
                <button
                  key={index}
                  role="radio"
                  aria-checked={index === routeIndex}
                  className={styles.routeChoice}
                  onClick={() => setRouteIndex(index)}
                >
                  <strong>{formatDuration(option.duration)}</strong>
                  <span>{index === fastestIndex(routeChoices) ? 'Mais rápida' : via ? `via ${via}` : formatDistance(option.distance)}</span>
                </button>
              );
            })}
          </div>
        )}
        {needsRoute && (
          <div className={styles.navRow}>
            <button
              className={styles.navigate}
              disabled={!chosenRoute}
              onClick={() => setNavigating(true)}
            >
              {chosenRoute ? <><NavigateIcon /> Iniciar navegação</> : 'Calculando rota…'}
            </button>
            <a className={styles.mapsLink} href={wazeUrl(destination.location)} target="_blank" rel="noopener noreferrer">
              Waze
            </a>
          </div>
        )}

        {confirmingFinish && needsOutcome(activeCall) ? (
          <OutcomeChoice busy={busy} onChoose={handleFinish} onCancel={() => setConfirmingFinish(false)} large={!landscape} />
        ) : confirmingFinish ? (
          <div className={styles.navRow}>
            <button className={styles.finishConfirm} disabled={busy} onClick={() => handleFinish()}>
              {busy ? 'Finalizando…' : 'Confirmar finalização'}
            </button>
            <button className={styles.secondaryButton} disabled={busy} onClick={() => setConfirmingFinish(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          // Antes de chegar ao local, finalizar fica pequeno (um toque errado no caminho encerraria o
          // atendimento); continua possível, porque o GPS pode não marcar a chegada. Depois, só é o
          // principal quando não resta caminho; enquanto há hospital a escolher ou a seguir, fica secundário
          <button
            className={phase === 'a_caminho' ? styles.finishEarly : finishIsMain ? styles.finish : styles.secondaryButton}
            onClick={() => setConfirmingFinish(true)}
          >
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
            <p className={styles.muted}>
              {push.state === 'on'
                ? 'Deixe o app aberto e o celular no carregador. O despacho toca mesmo com a tela apagada.'
                : 'Deixe o app aberto e o celular no carregador: o despacho toca e vibra nesta tela.'}
            </p>
            {push.state === 'ask' && (
              <button className={styles.pushButton} onClick={() => push.enable().catch(() => toast('Não foi possível ativar os avisos.', 'error'))}>
                <BellIcon /> Ativar avisos de despacho
              </button>
            )}
            {push.state === 'blocked' && (
              <p className={styles.pushBlocked}>Os avisos estão bloqueados. Libere as notificações deste site nas configurações do navegador.</p>
            )}
          </>
        ) : (
          <>
            <p className={styles.idleTitle}>{AMBULANCE_STATUS_LABEL[ambulance.status]}</p>
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
      <div className={styles.shellLandscape} data-landscape>
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
        {hospitalSheet}
        {needsAck && activeCall && (
          <DispatchAlert
            call={activeCall}
            onAck={() => handleAck()}
            onAckAndNavigate={needsRoute && chosenRoute ? () => handleAck(true) : undefined}
            route={chosenRoute}
            from={ambulance.location}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {header}
      {offlineBanner}
      <InstallBanner />
      {reportSheet}
      {hospitalSheet}

      <main className={styles.main}>
        {info}
        {mapView}
        {details}
      </main>
      {actionBar}
      {needsAck && activeCall && (
        <DispatchAlert
          call={activeCall}
          onAck={() => handleAck()}
          onAckAndNavigate={needsRoute && chosenRoute ? () => handleAck(true) : undefined}
          route={chosenRoute}
          from={ambulance.location}
        />
      )}
    </div>
  );
}
