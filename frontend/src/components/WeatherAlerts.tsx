import { WeatherEvent, WeatherEventType, RiskLevel } from '../types';

interface WeatherAlertsProps {
  events: WeatherEvent[];
}

export default function WeatherAlerts({ events }: WeatherAlertsProps) {
  const getEventIcon = (type: WeatherEventType): string => {
    switch (type) {
      case WeatherEventType.ALAGAMENTO:
        return '🌊';
      case WeatherEventType.QUEDA_ARVORE:
        return '🌳';
      case WeatherEventType.VENTOS_FORTES:
        return '💨';
      case WeatherEventType.ACIDENTE:
        return '🚧';
      default:
        return '⚠️';
    }
  };

  const getRiskColor = (risk: RiskLevel): string => {
    switch (risk) {
      case RiskLevel.CRITICO:
        return '#dc2626';
      case RiskLevel.ALTO:
        return '#f59e0b';
      case RiskLevel.MEDIO:
        return '#fbbf24';
      case RiskLevel.BAIXO:
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getRiskBgColor = (risk: RiskLevel): string => {
    switch (risk) {
      case RiskLevel.CRITICO:
        return '#fee2e2';
      case RiskLevel.ALTO:
        return '#fef3c7';
      case RiskLevel.MEDIO:
        return '#fef9c3';
      case RiskLevel.BAIXO:
        return '#dbeafe';
      default:
        return '#f3f4f6';
    }
  };

  if (events.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <p style={{ fontSize: '16px', margin: '0' }}>
          ✅ Nenhum evento climático ativo
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{
        margin: '0 0 16px 0',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1f2937'
      }}>
        Alertas Climáticos ({events.length})
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {events.map(event => (
          <div
            key={event.id}
            style={{
              padding: '16px',
              backgroundColor: getRiskBgColor(event.riskLevel),
              border: `2px solid ${getRiskColor(event.riskLevel)}`,
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>
                  {getEventIcon(event.type)}
                </span>
                <div>
                  <h3 style={{
                    margin: '0',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>
                    {event.type.replace(/_/g, ' ')}
                  </h3>
                </div>
              </div>

              {/* Risk Badge */}
              <div style={{
                padding: '4px 12px',
                backgroundColor: getRiskColor(event.riskLevel),
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {event.riskLevel}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.5'
              }}>
                {event.description}
              </p>
            </div>

            {/* Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '13px',
              color: '#4b5563'
            }}>
              <div>
                <strong>Raio de impacto:</strong> {event.radius}m
              </div>
              <div>
                <strong>Coordenadas:</strong> {event.location.lat.toFixed(4)}, {event.location.lng.toFixed(4)}
              </div>
            </div>

            {/* Timeline */}
            {event.estimatedEndTime && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(0,0,0,0.1)',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    ⏰ Início: {new Date(event.startTime).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span>
                    ⏱️ Previsão fim: {new Date(event.estimatedEndTime).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        border: '1px solid #fbbf24'
      }}>
        <p style={{
          margin: '0',
          fontSize: '13px',
          color: '#78350f'
        }}>
          ⚠️ <strong>Atenção:</strong> Eventos climáticos podem afetar o tempo de resposta e a segurança das rotas.
        </p>
      </div>
    </div>
  );
}


