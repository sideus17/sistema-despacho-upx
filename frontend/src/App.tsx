import { useState, useCallback, lazy, Suspense } from 'react';
import CallList from './components/CallList';
import DispatchAnalysis from './components/DispatchAnalysis';
import Incidents, { IncidentDraft } from './components/Incidents';
import NewCallForm from './components/NewCallForm';
import Fleet from './components/Fleet';
import { useToast } from './components/Toast';
import { useAuth } from './auth/AuthContext';
import { usePolling } from './hooks/usePolling';
import {
  Ambulance,
  EmergencyCall,
  Base,
  Coordinates,
  Incident,
  DispatchRecommendation,
  Stats
} from './types';
import {
  getAmbulances,
  getPendingCalls,
  getBases,
  getIncidents,
  createIncident,
  closeIncident,
  voteIncident,
  CreateIncidentRequest,
  analyzeDispatch,
  executeDispatch,
  finishDispatch,
  calculateRoute,
  getStats,
  getErrorMessage
} from './services/api';
import { INCIDENT_LABEL } from './map/incidents';
import { AddIcon, AmbulanceIcon, AnalyticsIcon, CallIcon, WarningIcon } from './ui/icons';
import { AccountMenu } from './components/AccountMenu';
import './styles/index.css';

// O mapa (MapLibre) é o maior pacote do app: carrega à parte, sem atrasar a primeira tela
const Map = lazy(() => import('./components/Map'));

type Connection = 'connecting' | 'online' | 'error';
type Tab = 'calls' | 'new-call' | 'analysis' | 'fleet' | 'incidents';

function App() {
  // State
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentDraft, setIncidentDraft] = useState<IncidentDraft | null>(null);
  const [focusIncident, setFocusIncident] = useState<{ id: string; at: number } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [selectedCall, setSelectedCall] = useState<EmergencyCall | null>(null);
  const [recommendation, setRecommendation] = useState<DispatchRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeLoadingId, setRouteLoadingId] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [activeTab, setActiveTabState] = useState<Tab>('calls');
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

  // Atualiza a cada 30s; se falhar (ex.: servidor acordando), tenta de novo em 10s
  usePolling(loadData, 30000, 10000);

  // Sair da aba de ocorrências desiste da marcação em andamento
  const setActiveTab = (tab: Tab) => {
    if (tab !== 'incidents') setIncidentDraft(null);
    setActiveTabState(tab);
  };

  const refreshIncidents = useCallback(async () => {
    try {
      const [incidentData, statsData] = await Promise.all([getIncidents(), getStats()]);
      setIncidents(incidentData);
      setStats(statsData);
    } catch {
      // O polling tenta de novo
    }
  }, []);

  const handlePickLocation = (location: Coordinates) => {
    setIncidentDraft(current => (current ? { ...current, location } : current));
  };

  const handleCreateIncident = async (request: CreateIncidentRequest) => {
    try {
      await createIncident(request);
      toast(`${INCIDENT_LABEL[request.type]} marcado no mapa`, 'success');
      await refreshIncidents();
      return true;
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível criar a ocorrência.'), 'error');
      return false;
    }
  };

  const handleCloseIncident = async (incident: Incident) => {
    try {
      await closeIncident(incident.id);
      toast(`${INCIDENT_LABEL[incident.type]} encerrado`, 'success');
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível encerrar a ocorrência.'), 'error');
    }
    await refreshIncidents();
  };

  // Relato de equipe confirmado pela central passa a bloquear a via
  const handleConfirmIncident = async (incident: Incident) => {
    try {
      await voteIncident(incident.id, 'SIM');
      toast(`${INCIDENT_LABEL[incident.type]} confirmado: a rota passa a desviar`, 'success');
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível confirmar a ocorrência.'), 'error');
    }
    await refreshIncidents();
  };

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

  const handleCallCreated = (call: EmergencyCall) => {
    loadData();
    handleAnalyze(call);
  };

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

  const handleFinish = async (call: EmergencyCall) => {
    try {
      await finishDispatch(call.id);
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
          <h1 className="header-brand"><img src="/ambulance.svg" alt="" className="header-logo" /> SAMU Despacho</h1>
          <AccountMenu onSignOut={signOut} />
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

      {/* Main Content */}
      <div className="main-content">
        {/* Map */}
        <div className="map-container">
          <Suspense fallback={<div className="map-loading" />}>
            <Map
              ambulances={ambulances}
              calls={calls}
              bases={bases}
              incidents={incidents}
              selectedCall={selectedCall}
              routeGeometry={recommendation?.recommendations[selectedRouteIndex]?.route?.geometry}
              onCallSelect={handleAnalyze}
              draft={incidentDraft}
              onPickLocation={handlePickLocation}
              onCloseIncident={handleCloseIncident}
              focusIncident={focusIncident}
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
                className={`sidebar-stat ${stats.pendingCalls > 0 ? 'sidebar-stat-alert' : ''}`}
                onClick={() => setActiveTab('calls')}
              >
                <strong>{stats.pendingCalls}</strong>
                <span>Pendentes</span>
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
                onDispatch={handleAnalyze}
                onFinish={handleFinish}
              />
            )}

            {activeTab === 'new-call' && (
              <NewCallForm onCallCreated={handleCallCreated} />
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
                draft={incidentDraft}
                onDraftChange={setIncidentDraft}
                onCreate={handleCreateIncident}
                onClose={handleCloseIncident}
                onConfirm={handleConfirmIncident}
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
