import { DispatchRecommendation, Ambulance, AmbulanceType } from '../types';
import { formatDistance, formatDuration } from '../services/api';

interface DispatchAnalysisProps {
  recommendation: DispatchRecommendation | null;
  ambulances: Ambulance[];
  onExecuteDispatch?: (ambulanceId: string) => void;
  loading?: boolean;
  selectedIndex?: number;
  onSelectRoute?: (index: number) => void;
}

export default function DispatchAnalysis({
  recommendation,
  ambulances,
  onExecuteDispatch,
  loading = false,
  selectedIndex = 0,
  onSelectRoute
}: DispatchAnalysisProps) {
  
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '12px', color: '#6b7280' }}>
          Analisando opções de despacho...
        </p>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        <p style={{ fontSize: '16px', margin: '0' }}>
          📊 Selecione um chamado para ver a análise de despacho
        </p>
      </div>
    );
  }

  const getAmbulanceInfo = (ambulanceId: string) => {
    return ambulances.find(amb => amb.id === ambulanceId);
  };

  const getTypeIcon = (type: AmbulanceType): string => {
    switch (type) {
      case AmbulanceType.USA: return '🚑';
      case AmbulanceType.USB: return '🚐';
      case AmbulanceType.MOTOLANCIA: return '🏍️';
      default: return '🚑';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Baixo';
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
        Análise de Despacho
      </h2>

      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
        <p style={{ margin: '0', fontSize: '14px', color: '#1e40af' }}>
          💡 <strong>Algoritmo:</strong> Score ponderado considerando distância (40%), disponibilidade (30%), tipo (20%) e clima (10%)
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recommendation.recommendations.map((rec, index) => {
          const ambulance = getAmbulanceInfo(rec.ambulanceId);
          if (!ambulance) return null;

          const isSelected = selectedIndex === index;
          const isBest = index === 0;

          return (
            <div
              key={rec.ambulanceId}
              style={{
                padding: '16px',
                backgroundColor: isSelected ? '#eff6ff' : 'white',
                border: isBest ? '2px solid #22c55e' : isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                boxShadow: isSelected ? '0 4px 6px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.1)'
              }}
              onClick={() => {
                if (onSelectRoute) onSelectRoute(index);
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {/* Best Badge */}
              {isBest && (
                <div style={{
                  position: 'absolute', top: '-10px', right: '16px', backgroundColor: '#22c55e', color: 'white',
                  padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                }}>
                  ⭐ MELHOR OPÇÃO
                </div>
              )}

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{getTypeIcon(ambulance.type)}</span>
                  <div>
                    <h3 style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>{ambulance.code}</h3>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>{ambulance.type}</p>
                  </div>
                </div>

                {/* Total Score */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: getScoreColor(rec.totalScore) }}>{rec.totalScore}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{getScoreLabel(rec.totalScore)}</div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px',
                padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Distância</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{rec.distanceScore}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Disponibilidade</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{rec.availabilityScore}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Tipo</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{rec.typeScore}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Clima</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: rec.weatherPenalty < 0 ? '#ef4444' : '#1f2937' }}>
                    {rec.weatherPenalty}
                  </div>
                </div>
              </div>

              {/* Route Info */}
              {rec.route && (
                <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#0c4a6e' }}>📏 Distância: <strong>{formatDistance(rec.route.distance)}</strong></span>
                    <span style={{ fontSize: '13px', color: '#0c4a6e' }}>⏱️ Tempo: <strong>{formatDuration(rec.route.duration)}</strong></span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#075985' }}>🚦 Risco da rota: <strong>{rec.route.riskLevel}</strong></div>
                </div>
              )}
              
              {/* Info quando rota não está disponível */}
              {!rec.route && (
                <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fde047', fontSize: '12px', color: '#92400e' }}>
                  💡 Rota detalhada será calculada ao executar o despacho
                </div>
              )}

              {/* Explanation */}
              <div style={{ padding: '10px', backgroundColor: '#fefce8', borderRadius: '6px', border: '1px solid #fde047', marginBottom: '12px' }}>
                <p style={{ margin: '0', fontSize: '13px', color: '#713f12', lineHeight: '1.5' }}>{rec.explanation}</p>
              </div>

              {/* Execute Button */}
              {isSelected && onExecuteDispatch && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExecuteDispatch(rec.ambulanceId);
                  }}
                  style={{
                    width: '100%', padding: '10px', backgroundColor: '#22c55e', color: 'white', border: 'none',
                    borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#16a34a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#22c55e'; }}
                >
                  ✅ Executar Despacho
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}