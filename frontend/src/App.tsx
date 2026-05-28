import { useState, useEffect } from 'react';
import Map from './components/Map';
import CallList from './components/CallList';
import DispatchAnalysis from './components/DispatchAnalysis';
import WeatherAlerts from './components/WeatherAlerts';
import NewCallForm from './components/NewCallForm';
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
  getStats
} from './services/api';
import './styles/index.css';

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
  const [activeTab, setActiveTab] = useState<'calls' | 'new-call' | 'analysis' | 'weather'>('calls');

  // Load initial data
  useEffect(() => {
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
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
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Handle call selection
  const handleCallSelect = async (call: EmergencyCall) => {
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
      alert('Erro ao analisar despacho. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCallCreated = async (call: EmergencyCall) => {
    await loadData();
    setSelectedCall(call);
    setActiveTab('calls');
  };

  // Handle dispatch execution
  const handleExecuteDispatch = async (ambulanceId: string) => {
    if (!selectedCall) return;

    const confirmed = window.confirm(
      'Confirma o despacho desta ambulância para o chamado selecionado?'
    );

    if (!confirmed) return;

    try {
      await executeDispatch(selectedCall.id, ambulanceId);
      alert('Despacho executado com sucesso!');
      
      // Reload data
      await loadData();
      
      // Clear selection
      setSelectedCall(null);
      setRecommendation(null);
      setActiveTab('calls');
    } catch (error) {
      console.error('Error executing dispatch:', error);
      alert('Erro ao executar despacho. Tente novamente.');
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>🚑 SAMU - Sistema de Despacho Inteligente</h1>
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
                <span className="stat-label">Chamados</span>
              </div>
              <div className="stat">
                <span className="stat-value">{stats.activeWeatherEvents}</span>
                <span className="stat-label">Alertas</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Map */}
        <div className="map-container">
          <Map
            ambulances={ambulances}
            calls={calls}
            bases={bases}
            weatherEvents={weatherEvents}
            selectedCall={selectedCall}
            routeGeometry={recommendation?.recommendations[selectedRouteIndex]?.route?.geometry}
            onCallSelect={handleCallSelect}
          />
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'calls' ? 'active' : ''}`}
              onClick={() => setActiveTab('calls')}
            >
              📞 Chamados ({calls.length})
            </button>
            <button
              className={`tab ${activeTab === 'new-call' ? 'active' : ''}`}
              onClick={() => setActiveTab('new-call')}
            >
              ➕ Novo
            </button>
            <button
              className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              📊 Análise
            </button>
            <button
              className={`tab ${activeTab === 'weather' ? 'active' : ''}`}
              onClick={() => setActiveTab('weather')}
            >
              ⚠️ Alertas ({weatherEvents.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'calls' && (
              <CallList
                calls={calls}
                selectedCall={selectedCall}
                onCallSelect={handleCallSelect}
              />
            )}

            {activeTab === 'new-call' && (
              <NewCallForm onCallCreated={handleCallCreated} />
            )}

            {activeTab === 'analysis' && (
              <DispatchAnalysis
                recommendation={recommendation}
                ambulances={ambulances}
                onExecuteDispatch={handleExecuteDispatch}
                loading={loading}
                selectedIndex={selectedRouteIndex}
                onSelectRoute={(index) => setSelectedRouteIndex(index)}
              />
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
          Dados mockados para demonstração | 
          Algoritmo: Score ponderado (Distância 40%, Disponibilidade 30%, Tipo 20%, Clima 10%)
        </p>
      </footer>
    </div>
  );
}

export default App;


