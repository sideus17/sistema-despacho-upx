import { useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
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
import { AddIcon, AmbulanceIcon, AnalyticsIcon, BackIcon, CallIcon, ManagementIcon, WarningIcon } from './ui/icons';
import { AccountMenu } from './components/AccountMenu';
import './styles/index.css';

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
  usePolling(loadData, 10000, 10000);

  // Chamados abertos ou regulados nesta tela não disparam os alertas de chegada na fila
  const ownQueueKeys = useRef(new Set<string>());
  useCallAlerts(calls, ownQueueKeys, toast);

  // "Escolher no mapa" do formulário de chamado: o próximo clique no mapa vira o local
  const callPickHandler = useRef<((location: Coordinates) => void) | null>(null);
  const [pickingCall, setPickingCall] = useState(false);
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

  // Calcula sob demanda a rota da opção selecionada (o backend só traz a da melhor)
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
            <span>Conectando ao servidor… o primeiro acesso pode levar até 1 minuto.</span>
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
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
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
          {/* Resumo: cada número abre a aba correspondente */}
          {stats && (
            <div className="sidebar-stats" role="group" aria-label="Resumo">
              <button
                className="sidebar-stat"
                title={`${stats.availableAmbulances} de ${stats.totalAmbulances} viaturas disponíveis`}
                onClick={() => setActiveTab('fleet')}
              >
                <strong>{stats.availableAmbulances}/{stats.totalAmbulances}</strong>
                <span>Viaturas</span>
              </button>
              <button
                className={`sidebar-stat ${stats.awaitingRegulation > 0 ? 'sidebar-stat-alert' : ''}`}
                title="Chamados aguardando regulação"
                onClick={() => setActiveTab('calls')}
              >
                <strong>{stats.awaitingRegulation}</strong>
                <span>Regulação</span>
              </button>
              <button
                className={`sidebar-stat ${stats.pendingCalls > 0 ? 'sidebar-stat-alert' : ''}`}
                title="Chamados regulados aguardando despacho"
                onClick={() => setActiveTab('calls')}
              >
                <strong>{stats.pendingCalls}</strong>
                <span>Despacho</span>
              </button>
              <button className="sidebar-stat" onClick={() => setActiveTab('incidents')}>
                <strong>{stats.activeIncidents}</strong>
                <span>Ocorrências</span>
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'calls' ? 'active' : ''}`}
              onClick={() => setActiveTab('calls')}
            >
              <CallIcon /> Chamados
            </button>
            <button
              className={`tab ${activeTab === 'new-call' ? 'active' : ''}`}
              onClick={() => setActiveTab('new-call')}
            >
              <AddIcon /> Novo
            </button>
            <button
              className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              <AnalyticsIcon /> Análise
            </button>
            <button
              className={`tab ${activeTab === 'fleet' ? 'active' : ''}`}
              onClick={() => setActiveTab('fleet')}
            >
              <AmbulanceIcon /> Frota
            </button>
            <button
              className={`tab ${activeTab === 'incidents' ? 'active' : ''}`}
              onClick={() => setActiveTab('incidents')}
            >
              <WarningIcon /> Ocorrências
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
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
              />
            )}

            {activeTab === 'new-call' && (
              <NewCallForm
                onCallCreated={handleCallCreated}
                picking={pickingCall}
                onPickOnMap={startCallPick}
                onCancelPick={cancelCallPick}
                onDraftChange={setCallDraft}
                ambulances={ambulances}
                onShowCall={handleFocusCall}
              />
            )}

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
