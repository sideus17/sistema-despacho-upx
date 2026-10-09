import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Ambulance, AmbulanceStatus, AmbulanceType, CallStatus, EmergencyCall, RiskLevel, RouteInfo } from '../types';
import {
  getAmbulances,
  getPendingCalls,
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
import { PriorityLabel } from '../ui/PriorityLabel';
import { AmbulanceTypeIcon } from '../ui/AmbulanceTypeIcon';
import { BellIcon, CheckCircleIcon, DetourIcon, DistanceIcon, NavigateIcon, TimerIcon, WarningIcon } from '../ui/icons';
import { useAuth } from '../auth/AuthContext';
import InstallBanner from './InstallBanner';
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
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ambulances, setAmbulances] = useState<Ambulance[]>(snapshot?.ambulances ?? []);
  const [calls, setCalls] = useState<EmergencyCall[]>(snapshot?.calls ?? []);
  const [savedAt, setSavedAt] = useState<string | null>(snapshot?.savedAt ?? null);
  const [connection, setConnection] = useState<'connecting' | 'online' | 'error'>('connecting');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isNewDispatch, setIsNewDispatch] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const lastCallId = useRef<string | null | undefined>(undefined);
  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [ambData, callData] = await Promise.all([getAmbulances(), getPendingCalls()]);
      const now = new Date().toISOString();
      setAmbulances(ambData);
      setCalls(callData);
      setSavedAt(now);
      setConnection('online');
      saveSnapshot({ ambulances: ambData, calls: callData, savedAt: now });
      return true;
    } catch {
      setConnection('error');
      return false;
    }
  }, []);

  // A equipe precisa saber rápido de um despacho novo
  usePolling(loadData, 10000, 5000);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // A viatura do motorista é a que está no turno dele
  const ambulance = ambulances.find(a => a.driver?.id === me.id);
  const activeCall = ambulance
    ? calls.find(c => c.status === CallStatus.EM_ATENDIMENTO && c.ambulance_id === ambulance.id)
    : undefined;

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

  // Rota da viatura até o chamado atual
  useEffect(() => {
    setRoute(null);
    setConfirmingFinish(false);
    setNavigating(false);
    if (!activeCall || !ambulance) return;

    let cancelled = false;
    calculateRoute(ambulance.location, activeCall.location)
      .then(result => { if (!cancelled) setRoute(result); })
      .catch(() => { /* sem rota: o mapa mostra só os dois pontos */ });

    return () => { cancelled = true; };
  }, [activeCall?.id, ambulance?.id]);

  const handleStartShift = async (target: Ambulance) => {
    setBusy(true);
    try {
      await startShift(target.id);
      toast(`Turno iniciado na ${target.code}. A central já vê você disponível.`, 'success');
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
      setConfirmingEnd(false);
    }
  };

  // Sair apaga os dados guardados para uso offline (incluem informações de pacientes)
  const handleSignOut = async () => {
    saveSnapshot(null);
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
    const freeAmbulances = ambulances.filter(a => !a.driver && (typeFilter === 'ALL' || a.type === typeFilter));

    return (
      <div className={styles.shell}>
        {offlineBanner}
        <main className={styles.picker}>
          <p className={styles.muted}>Olá, {me.fullName.split(' ')[0]}</p>
          <h1>Iniciar turno</h1>
          <p className={styles.muted}>Escolha a viatura que você vai usar hoje. A central passa a ver seu nome nela.</p>

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

          {freeAmbulances.length === 0 ? (
            <p className={styles.muted}>Nenhuma viatura livre deste tipo agora.</p>
          ) : (
            <ul className={styles.pickerList}>
              {freeAmbulances.map(a => (
                <li key={a.id}>
                  <button className={styles.pickerItem} disabled={busy} onClick={() => handleStartShift(a)}>
                    <span className={styles.pickerCode}><AmbulanceTypeIcon type={a.type} /> {a.code}</span>
                    <span className={styles.muted}>{a.type} · equipe: {a.crew.medic}{a.crew.nurse ? `, ${a.crew.nurse}` : ''}</span>
                    <StatusPill status={a.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button className={styles.signOut} onClick={handleSignOut}>Sair da conta</button>
        </main>
      </div>
    );
  }

  const meta = activeCall ? PRIORITY_META[activeCall.priority] : undefined;
  const gender = activeCall ? formatGender(activeCall.patientInfo.gender) : null;
  const detour = route?.weatherEvents.find(e => e.description.startsWith('[DESVIO ATIVADO]'));
  const risky = route && (route.riskLevel === RiskLevel.ALTO || route.riskLevel === RiskLevel.CRITICO);

  if (navigating && activeCall && route) {
    return (
      <Suspense fallback={<div className={styles.shell}><div className={styles.centered}><div className={styles.spinner} /></div></div>}>
        <NavigationView
          ambulance={ambulance}
          call={activeCall}
          initialRoute={route}
          simulate={SIMULATE}
          onExit={() => setNavigating(false)}
          onFinish={handleFinish}
        />
      </Suspense>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.headerCode}><AmbulanceTypeIcon type={ambulance.type} /> {ambulance.code} <span>{ambulance.type} · {me.fullName.split(' ')[0]}</span></p>
          <StatusPill status={ambulance.status} />
        </div>
        {/* Durante um atendimento o turno não pode ser encerrado */}
        {!activeCall && (
          confirmingEnd ? (
            <div className={styles.headerConfirm}>
              <button className={styles.linkButton} disabled={busy} onClick={handleEndShift}>Encerrar</button>
              <button className={styles.linkButton} disabled={busy} onClick={() => setConfirmingEnd(false)}>Voltar</button>
            </div>
          ) : (
            <button className={styles.linkButton} onClick={() => setConfirmingEnd(true)}>Encerrar turno</button>
          )
        )}
      </header>

      {offlineBanner}
      <InstallBanner />

      {activeCall && meta ? (
        <>
          <main className={styles.main}>
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

            <div className={styles.mapWrap}>
              <Suspense fallback={null}>
                <CrewMap ambulance={ambulance} call={activeCall} route={route?.geometry} />
              </Suspense>
            </div>

            {route && (
              <div className={styles.routeInfo}>
                <span><DistanceIcon /> <strong>{formatDistance(route.distance)}</strong></span>
                <span><TimerIcon /> <strong>{formatDuration(route.duration)}</strong></span>
              </div>
            )}
            {detour ? (
              <p className={styles.warning}><DetourIcon /> Rota desviada para evitar área de risco. {detour.description.replace('[DESVIO ATIVADO] ', '')}</p>
            ) : risky && (
              <p className={styles.warning}><WarningIcon /> A rota passa por área de risco {route?.riskLevel}.</p>
            )}
          </main>

          <nav className={styles.actionBar}>
            <div className={styles.navRow}>
              <button
                className={styles.navigate}
                disabled={!route}
                onClick={() => {
                  setIsNewDispatch(false);
                  setNavigating(true);
                }}
              >
                {route ? <><NavigateIcon /> Iniciar navegação</> : 'Calculando rota…'}
              </button>
              {route && (
                <a
                  className={styles.mapsLink}
                  href={googleMapsUrl(ambulance.location, activeCall.location, route.geometry, route.waypoints)}
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
        </>
      ) : (
        <>
          <main className={styles.main}>
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

            <div className={styles.mapWrap}>
              <Suspense fallback={null}>
                <CrewMap ambulance={ambulance} />
              </Suspense>
            </div>
          </main>

          <nav className={styles.actionBar}>
            <button
              className={ambulance.status === AmbulanceStatus.DISPONIVEL ? styles.secondaryButton : styles.finish}
              disabled={busy}
              onClick={handleToggleAvailability}
            >
              {ambulance.status === AmbulanceStatus.DISPONIVEL ? 'Ficar indisponível' : 'Ficar disponível'}
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
