import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CallList from './components/CallList';
import DispatchAnalysis from './components/DispatchAnalysis';
import Incidents from './components/Incidents';
import NewCallForm from './components/NewCallForm';
import RegulationPanel from './components/RegulationPanel';
import Fleet from './components/Fleet';
import { useToast } from './components/Toast';
import { useAuth } from './auth/AuthContext';
import { usePolling } from './hooks/usePolling';
import { queueKey, useCallAlerts } from './hooks/useCallAlerts';
import {
  Ambulance,
  EmergencyCall,
  Base,
  Incident,
  DispatchRecommendation,
  Stats,
  Coordinates,
  CallOutcome,
  CallStatus,
  Hospital,
  RegulationDecision
} from './types';
import { queueOf } from './utils/calls';
import {
  getAmbulances,
  getPendingCalls,
  getBases,
  getIncidents,
  analyzeDispatch,
  executeDispatch,
  finishDispatch,
  calculateRoute,
  getStats,
  getErrorMessage,
  getHospitals,
  setCallHospital
} from './services/api';
import { AddIcon, AmbulanceIcon, BackIcon, CallIcon, ManagementIcon, WarningIcon } from './ui/icons';
import { AccountMenu } from './components/AccountMenu';
import { Spinner } from './ui/Spinner';

// O mapa (MapLibre) é o maior pacote do app: carrega à parte, sem atrasar a primeira tela
const Map = lazy(() => import('./components/Map'));
// A gestão só carrega quando aberta
const ManagementPage = lazy(() => import('./components/management/ManagementPage'));

type Connection = 'connecting' | 'online' | 'error';
type Tab = 'calls' | 'new-call' | 'regulation' | 'analysis' | 'fleet' | 'incidents';
type View = 'operacao' | 'gestao';

function App() {
  // State
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  // Os alertas só comparam depois da primeira carga (a lista vazia de antes não diz nada)
  const [callsLoaded, setCallsLoaded] = useState(false);
  const [bases, setBases] = useState<Base[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  // Hospitais quase não mudam: carregam uma vez (de novo só se a tentativa falhou)
  const hospitalsLoaded = useRef(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [focusIncident, setFocusIncident] = useState<{ id: string; at: number } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [selectedCall, setSelectedCall] = useState<EmergencyCall | null>(null);
  const [recommendation, setRecommendation] = useState<DispatchRecommendation | null>(null);
  // Chamado aberto na regulação (o painel acompanha a versão da lista, atualizada a cada 10 s)
  const [regulatingId, setRegulatingId] = useState<string | null>(null);
  // Chamado de onde a regulação ou a análise foi aberta: ao voltar, o foco volta ao cartão dele
  const [returnCallId, setReturnCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeLoadingId, setRouteLoadingId] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [activeTab, setActiveTab] = useState<Tab>('calls');
  // Na gestão a operação continua montada: o polling e o alerta de chamado novo seguem valendo
  const [view, setView] = useState<View>('operacao');
  const toast = useToast();
  const { signOut } = useAuth();

  const loadData = useCallback(async () => {
    try {
      const [ambData, callData, baseData, incidentData, statsData] = await Promise.all([
        getAmbulances(),
        getPendingCalls(),
        getBases(),
        getIncidents(),
        getStats()
      ]);

      setAmbulances(ambData);
      setCalls(callData);
      setCallsLoaded(true);
      setBases(baseData);
      if (!hospitalsLoaded.current) {
        hospitalsLoaded.current = true;
        getHospitals().then(setHospitals).catch(() => { hospitalsLoaded.current = false; });
      }
      setIncidents(incidentData);
      setStats(statsData);
      setConnection('online');
      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      setConnection('error');
      return false;
    }
  }, []);

  // Atualiza a cada 10 s, como o app da equipe: chamado novo aparece (e alerta) logo; se falhar, tenta de novo em 10 s
  usePolling(loadData, 10000, 10000, { whileHidden: true });

  // Chamados abertos ou regulados nesta tela não disparam os alertas de chegada na fila
  const ownQueueKeys = useRef(new Set<string>());
  // Viaturas liberadas por esta tela (ao finalizar): o aviso de "ficou livre" não volta para quem finalizou
  const ownFreed = useRef(new Set<string>());
  useCallAlerts(callsLoaded ? calls : null, ownQueueKeys, toast, ambulances, ownFreed);

  // "Escolher no mapa" do formulário de chamado: o próximo clique no mapa vira o local
  const callPickHandler = useRef<((location: Coordinates) => void) | null>(null);
  const [pickingCall, setPickingCall] = useState(false);
  // Chamado em preenchimento no "Novo" (o ponto na aba avisa quando ele está escondido)
  const [draftDirty, setDraftDirty] = useState(false);
  const [callDraft, setCallDraft] = useState<Coordinates | null>(null);

  const startCallPick = useCallback((onPick: (location: Coordinates) => void) => {
    callPickHandler.current = onPick;
    setPickingCall(true);
  }, []);
  const cancelCallPick = useCallback(() => {
    callPickHandler.current = null;
    setPickingCall(false);
  }, []);
  const callPick = useMemo(
    () => (pickingCall
      ? {
          onPick: (location: Coordinates) => {
            callPickHandler.current?.(location);
            cancelCallPick();
          },
          onCancel: cancelCallPick
        }
      : null),
    [pickingCall, cancelCallPick]
  );

  // Seleciona o chamado no mapa sem abrir a análise
  const handleFocusCall = (call: EmergencyCall) => {
    setSelectedCall(call);
    if (recommendation?.callId !== call.id) {
      setRecommendation(null);
      setSelectedRouteIndex(0);
    }
  };

  const handleAnalyze = async (call: EmergencyCall) => {
    setSelectedCall(call);
    setReturnCallId(call.id);
    setActiveTab('analysis');
    setSelectedRouteIndex(0);
    setLoading(true);
    setRecommendation(null);

    try {
      const result = await analyzeDispatch(call.id);
      setRecommendation(result);
    } catch (error) {
      console.error('Error analyzing dispatch:', error);
      toast(getErrorMessage(error, 'Erro ao analisar despacho. Tente novamente.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Regulação: o mesmo atendente que registrou já pode regular (ou outro, pela fila)
  const handleRegulate = (call: EmergencyCall) => {
    setSelectedCall(call);
    setReturnCallId(call.id);
    setRecommendation(null);
    setRegulatingId(call.id);
    setActiveTab('regulation');
  };

  const handleCallCreated = (call: EmergencyCall) => {
    ownQueueKeys.current.add(queueKey(call));
    // Já entra na lista: o painel de regulação acompanha o chamado por ela
    setCalls(current => [...current.filter(item => item.id !== call.id), call]);
    handleRegulate(call);
    loadData();
  };

  const handleRegulated = (call: EmergencyCall, decision: RegulationDecision) => {
    const wasWaitingDispatch = calls.find(item => item.id === call.id)?.status === CallStatus.PENDENTE;
    ownQueueKeys.current.add(queueKey(call));
    setCalls(current => current.map(item => (item.id === call.id ? call : item)));
    setRegulatingId(null);
    if (decision === RegulationDecision.DESPACHAR && !wasWaitingDispatch) {
      // Regulado para mandar viatura: segue direto para a escolha da viatura
      handleAnalyze(call);
    } else {
      toast(
        decision === RegulationDecision.ORIENTACAO
          ? 'Chamado encerrado com orientação por telefone.'
          : decision === RegulationDecision.CANCELAR
            ? 'Chamado cancelado.'
            : 'Regulação salva.',
        'success'
      );
      if (decision !== RegulationDecision.DESPACHAR) setSelectedCall(null);
      setActiveTab('calls');
    }
    loadData();
  };

  // Lista e mapa: chamado na fila de regulação abre a regulação; na de despacho, a análise
  const handleOpenCall = (call: EmergencyCall) => {
    if (call.status === CallStatus.AGUARDANDO_REGULACAO) handleRegulate(call);
    else if (call.status === CallStatus.PENDENTE) handleAnalyze(call);
    else handleFocusCall(call);
  };

  const waitingTotal = (stats?.pendingCalls ?? 0) + (stats?.awaitingRegulation ?? 0);
  const regulatingCall = regulatingId ? calls.find(call => call.id === regulatingId) ?? null : null;

  // Saiu do "Novo" no meio da escolha no mapa: a escolha para, o rascunho fica
  useEffect(() => {
    if (activeTab !== 'new-call' && pickingCall) cancelCallPick();
  }, [activeTab]);

  // Esc volta da regulação e da análise para a lista (dentro de um campo, o Esc é do campo)
  useEffect(() => {
    if (activeTab !== 'regulation' && activeTab !== 'analysis') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [role="dialog"]')) return;
      if (activeTab === 'regulation') setRegulatingId(null);
      setActiveTab('calls');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab]);

  // Atalhos da central, fora de campos de texto e diálogos: N abre o novo chamado; na fila, J e K andam
  // entre os chamados (foco no endereço do cartão), R regula e D despacha o chamado em foco
  useEffect(() => {
    if (view !== 'operacao') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'n') {
        event.preventDefault();
        setActiveTab('new-call');
        window.setTimeout(() => document.getElementById('call-phone')?.focus(), 0);
        return;
      }
      if (activeTab !== 'calls') return;
      if (key === 'j' || key === 'k') {
        const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-card-button]'));
        if (cards.length === 0) return;
        event.preventDefault();
        const current = cards.indexOf(document.activeElement as HTMLElement);
        const next = current === -1 ? 0 : Math.min(cards.length - 1, Math.max(0, current + (key === 'j' ? 1 : -1)));
        cards[next].focus();
        // E seleciona: o mapa vai até o chamado, como no clique
        const call = calls.find(item => item.id === cards[next].closest<HTMLElement>('[data-call-id]')?.dataset.callId);
        if (call) handleFocusCall(call);
        return;
      }
      if (key === 'r' || key === 'd') {
        const id = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-call-id]')?.dataset.callId;
        const call = calls.find(item => item.id === id);
        const queue = call ? queueOf(call) : null;
        if (!call || !queue) return;
        if (key === 'r') {
          event.preventDefault();
          handleRegulate(call);
        } else if (queue === 'despacho') {
          event.preventDefault();
          handleAnalyze(call);
        } else {
          // Ainda sem cor final: não há o que despachar
          toast('Regule primeiro (R)', 'info');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, activeTab, calls, recommendation]);

  // Rota da opção selecionada: o servidor já traz a das livres; calcula aqui só se faltar (motor fora do ar)
  const handleSelectRoute = async (index: number) => {
    setSelectedRouteIndex(index);

    const rec = recommendation?.recommendations[index];
    const ambulance = ambulances.find(a => a.id === rec?.ambulanceId);
    if (!rec || rec.route || !ambulance || !selectedCall) return;

    setRouteLoadingId(rec.ambulanceId);
    try {
      const route = await calculateRoute(ambulance.location, selectedCall.location);
      setRecommendation(current => current && current.callId === recommendation?.callId
        ? {
            ...current,
            recommendations: current.recommendations.map(r => r.ambulanceId === rec.ambulanceId ? { ...r, route } : r)
          }
        : current
      );
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível calcular a rota.'), 'error');
    } finally {
      setRouteLoadingId(null);
    }
  };

  // Handle dispatch execution
  const handleExecuteDispatch = async (ambulanceId: string) => {
    if (!selectedCall) return;
    const ambulance = ambulances.find(a => a.id === ambulanceId);

    try {
      await executeDispatch(selectedCall.id, ambulanceId);
      toast(`${ambulance?.code ?? 'Ambulância'} despachada para ${selectedCall.address}`, 'success');
      setRecommendation(null);
      setActiveTab('calls');
    } catch (error) {
      console.error('Error executing dispatch:', error);
      toast(getErrorMessage(error, 'Erro ao executar despacho. Tente novamente.'), 'error');
    }

    await loadData();
  };

  // Hospital de destino (a equipe vê na hora e pode trocar)
  const handleHospitalChange = async (call: EmergencyCall, hospitalId: string | null) => {
    const hospital = hospitals.find(item => item.id === hospitalId);
    try {
      await setCallHospital(call.id, hospitalId);
      toast(hospital ? `Destino: ${hospital.shortName}` : 'Destino retirado: a equipe decide', 'success');
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível escolher o hospital.'), 'error');
    }
    await loadData();
  };

  const handleFinish = async (call: EmergencyCall, outcome?: CallOutcome) => {
    if (call.ambulance_id) ownFreed.current.add(call.ambulance_id);
    try {
      await finishDispatch(call.id, outcome);
      toast('Atendimento finalizado. Viatura liberada.', 'success');
      if (selectedCall?.id === call.id) setSelectedCall(null);
    } catch (error) {
      toast(getErrorMessage(error, 'Erro ao finalizar atendimento.'), 'error');
    }

    await loadData();
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-brand">
            <img src="/ambulance.svg" alt="" className="header-logo" /> <span className="header-brand-name">SAMU Despacho</span>
          </h1>
          <div className="header-actions">
            {view === 'operacao' ? (
              <button type="button" className="header-view" onClick={() => setView('gestao')}>
                <ManagementIcon /> Gestão
              </button>
            ) : (
              <button
                type="button"
                className="header-view"
                aria-label={waitingTotal ? `Voltar à operação (${waitingTotal} aguardando regulação ou despacho)` : 'Voltar à operação'}
                onClick={() => setView('operacao')}
              >
                <BackIcon /> <span className="header-view-long">Voltar à operação</span>
                <span className="header-view-short">Operação</span>
                {!!waitingTotal && (
                  <span
                    className="header-view-badge"
                    title={`${stats?.awaitingRegulation ?? 0} aguardando regulação · ${stats?.pendingCalls ?? 0} aguardando despacho`}
                  >
                    {waitingTotal}
                  </span>
                )}
              </button>
            )}
            <AccountMenu onSignOut={signOut} />
          </div>
        </div>
      </header>

      {connection !== 'online' && (
        <div className={`connection-banner ${connection}`} role="status">
          {connection === 'connecting' ? (
            <span>Conectando ao servidor… pode levar até 1 minuto.</span>
          ) : (
            <>
              <span>
                {stats ? 'Falha ao atualizar os dados.' : 'Não foi possível conectar ao servidor.'} Tentando novamente…
              </span>
              <button onClick={loadData}>Tentar agora</button>
            </>
          )}
        </div>
      )}

      {view === 'gestao' && (
        <Suspense fallback={<div className="loading"><Spinner size={40} /></div>}>
          <ManagementPage ambulances={ambulances} hospitals={hospitals} bases={bases} />
        </Suspense>
      )}

      {/* Main Content */}
      <div className="main-content" hidden={view === 'gestao'}>
        {/* Map */}
        <div className="map-container">
          <Suspense fallback={<div className="map-loading" />}>
            <Map
              ambulances={ambulances}
              calls={calls}
              bases={bases}
              hospitals={hospitals}
              incidents={incidents}
              selectedCall={selectedCall}
              routeGeometry={recommendation?.recommendations[selectedRouteIndex]?.route?.geometry}
              onCallSelect={handleOpenCall}
              focusIncident={focusIncident}
              callPick={callPick}
              callDraft={callDraft}
            />
          </Suspense>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Abas: regulação e análise de despacho são passos de um chamado, sem aba própria */}
          <div className="tabs" role="tablist" aria-label="Painéis da central">
            {([
              ['calls', <CallIcon />, 'Chamados'],
              ['new-call', <AddIcon />, 'Novo'],
              ['fleet', <AmbulanceIcon />, 'Frota'],
              ['incidents', <WarningIcon />, 'Ocorrências']
            ] as const).map(([tab, icon, label]) => {
              // Regulação e análise são passos de um chamado: a aba que fica marcada é "Chamados"
              const selected = tab === 'calls' ? ['calls', 'regulation', 'analysis'].includes(activeTab) : activeTab === tab;
              return (
                <button
                  key={tab}
                  id={`aba-${tab}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="painel-central"
                  {...(tab === 'new-call' && { title: 'Novo chamado (N)', 'aria-keyshortcuts': 'N' })}
                  className={`tab ${selected ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {icon} {label}
                  {tab === 'new-call' && draftDirty && !selected && <span className="tab-dot" title="Chamado em preenchimento" aria-label="(em preenchimento)" />}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div
            className="tab-content"
            id="painel-central"
            role="tabpanel"
            aria-labelledby={`aba-${['regulation', 'analysis'].includes(activeTab) ? 'calls' : activeTab}`}
          >
            {activeTab === 'calls' && (
              <CallList
                calls={calls}
                ambulances={ambulances}
                selectedCallId={selectedCall?.id}
                onFocus={handleFocusCall}
                onRegulate={handleRegulate}
                onDispatch={handleAnalyze}
                onFinish={handleFinish}
                hospitals={hospitals}
                onHospitalChange={handleHospitalChange}
                focusCallId={returnCallId}
                onFocusRestored={() => setReturnCallId(null)}
              />
            )}

            {/* Sempre montado: trocar de aba ou abrir um chamado no meio da ligação não apaga o que foi digitado */}
            <div hidden={activeTab !== 'new-call'}>
              <NewCallForm
                onCallCreated={handleCallCreated}
                picking={pickingCall}
                onPickOnMap={startCallPick}
                onCancelPick={cancelCallPick}
                onDraftChange={setCallDraft}
                onDirtyChange={setDraftDirty}
                ambulances={ambulances}
                onShowCall={handleFocusCall}
              />
            </div>

            {activeTab === 'regulation' && (
              <RegulationPanel
                key={regulatingId ?? 'nenhum'}
                call={regulatingCall}
                hospitals={hospitals}
                onDone={handleRegulated}
                onBack={() => {
                  setRegulatingId(null);
                  setActiveTab('calls');
                }}
              />
            )}

            {activeTab === 'analysis' && (
              <DispatchAnalysis
                call={selectedCall}
                recommendation={recommendation}
                ambulances={ambulances}
                calls={calls}
                onExecuteDispatch={handleExecuteDispatch}
                onBack={() => setActiveTab('calls')}
                onRetry={() => selectedCall && handleAnalyze(selectedCall)}
                loading={loading}
                selectedIndex={selectedRouteIndex}
                routeLoadingId={routeLoadingId}
                onSelectRoute={handleSelectRoute}
              />
            )}

            {activeTab === 'fleet' && (
              <Fleet ambulances={ambulances} />
            )}

            {activeTab === 'incidents' && (
              <Incidents
                incidents={incidents}
                onFocus={incident => setFocusIncident({ id: incident.id, at: Date.now() })}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
