import { useState, useCallback, lazy, Suspense } from 'react';
import CallList from './components/CallList';
import DispatchAnalysis from './components/DispatchAnalysis';
import WeatherAlerts from './components/WeatherAlerts';
import NewCallForm from './components/NewCallForm';
import Fleet from './components/Fleet';
import { useToast } from './components/Toast';
import { useAuth } from './auth/AuthContext';
import { usePolling } from './hooks/usePolling';
import {
  Ambulance,
  EmergencyCall,
  Base,
  WeatherEvent,
  DispatchRecommendation,
  Stats
} from './types';
import {
  getAmbulances,
  getPendingCalls,
  getBases,
  getWeatherEvents,
  analyzeDispatch,
  executeDispatch,
  finishDispatch,
  calculateRoute,
  getStats,
  getErrorMessage
} from './services/api';
import { AddIcon, AmbulanceIcon, AnalyticsIcon, CallIcon, HeadsetIcon, WarningIcon } from './ui/icons';
import './styles/index.css';

// O mapa (MapLibre) é o maior pacote do app: carrega à parte, sem atrasar a primeira tela
const Map = lazy(() => import('./components/Map'));

type Connection = 'connecting' | 'online' | 'error';

function App() {
  // State
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [weatherEvents, setWeatherEvents] = useState<WeatherEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [selectedCall, setSelectedCall] = useState<EmergencyCall | null>(null);
  const [recommendation, setRecommendation] = useState<DispatchRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeLoadingId, setRouteLoadingId] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [activeTab, setActiveTab] = useState<'calls' | 'new-call' | 'analysis' | 'fleet' | 'weather'>('calls');
  const toast = useToast();
  const { me, signOut } = useAuth();

  const loadData = useCallback(async () => {
    try {
      const [ambData, callData, baseData, weatherData, statsData] = await Promise.all([
        getAmbulances(),
        getPendingCalls(),
        getBases(),
        getWeatherEvents(),
        getStats()
      ]);

      setAmbulances(ambData);
      setCalls(callData);
      setBases(baseData);
      setWeatherEvents(weatherData);
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
          <div className="header-title">
            <h1><img src="/ambulance.svg" alt="" className="header-logo" /> SAMU - Sistema de Despacho Inteligente</h1>
            <p>Sorocaba/SP - Sistema Acadêmico</p>
          </div>

          {stats && (
            <div className="header-stats">
              <div className="stat">
                <span className="stat-value">{stats.availableAmbulances}/{stats.totalAmbulances}</span>
                <span className="stat-label">Ambulâncias</span>
              </div>
              <div className="stat">
                <span className="stat-value">{stats.pendingCalls}</span>
                <span className="stat-label">Pendentes</span>
              </div>
              <div className="stat">
                <span className="stat-value">{stats.activeWeatherEvents}</span>
                <span className="stat-label">Alertas</span>
              </div>
            </div>
          )}

          <div className="header-user">
            <span><HeadsetIcon /> {me.fullName}</span>
            <button onClick={signOut}>Sair</button>
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

      {/* Main Content */}
      <div className="main-content">
        {/* Map */}
        <div className="map-container">
          <Suspense fallback={<div className="map-loading" />}>
            <Map
              ambulances={ambulances}
              calls={calls}
              bases={bases}
              weatherEvents={weatherEvents}
              selectedCall={selectedCall}
              routeGeometry={recommendation?.recommendations[selectedRouteIndex]?.route?.geometry}
              onCallSelect={handleAnalyze}
            />
          </Suspense>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'calls' ? 'active' : ''}`}
              onClick={() => setActiveTab('calls')}
            >
              <CallIcon /> Chamados
              {calls.length > 0 && <span className="tab-badge">{calls.length}</span>}
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
              className={`tab ${activeTab === 'weather' ? 'active' : ''}`}
              onClick={() => setActiveTab('weather')}
            >
              <WarningIcon /> Alertas
              {weatherEvents.length > 0 && <span className="tab-badge">{weatherEvents.length}</span>}
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

            {activeTab === 'weather' && (
              <WeatherAlerts events={weatherEvents} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>
          Sistema Acadêmico - Usina de Projetos Experimentais |
          Algoritmo: Score ponderado (Distância 40%, Disponibilidade 30%, Tipo 20%, Clima 10%)
        </p>
      </footer>
    </div>
  );
}

export default App;
