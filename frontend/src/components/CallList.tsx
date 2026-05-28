import { EmergencyCall, CallPriority, CallStatus } from '../types';
import { getTimeAgo } from '../services/api';

interface CallListProps {
  calls: EmergencyCall[];
  selectedCall?: EmergencyCall | null;
  onCallSelect: (call: EmergencyCall) => void;
}

export default function CallList({ calls, selectedCall, onCallSelect }: CallListProps) {
  const getPriorityColor = (priority: CallPriority): string => {
    switch (priority) {
      case CallPriority.EMERGENCIA:
        return '#dc2626';
      case CallPriority.URGENTE:
        return '#f59e0b';
      case CallPriority.PRIORITARIO:
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getPriorityBadge = (priority: CallPriority): string => {
    switch (priority) {
      case CallPriority.EMERGENCIA:
        return '🚨';
      case CallPriority.URGENTE:
        return '⚠️';
      case CallPriority.PRIORITARIO:
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  const pendingCalls = calls.filter(call => call.status === CallStatus.PENDENTE);

  if (pendingCalls.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <p style={{ fontSize: '16px', margin: '0' }}>
          ✅ Nenhum chamado pendente
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
        Chamados Pendentes ({pendingCalls.length})
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {pendingCalls.map(call => (
          <div
            key={call.id}
            onClick={() => onCallSelect(call)}
            style={{
              padding: '16px',
              backgroundColor: selectedCall?.id === call.id ? '#eff6ff' : 'white',
              border: selectedCall?.id === call.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: selectedCall?.id === call.id ? '0 4px 6px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (selectedCall?.id !== call.id) {
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCall?.id !== call.id) {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
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
                <span style={{ fontSize: '20px' }}>
                  {getPriorityBadge(call.priority)}
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: getPriorityColor(call.priority),
                  textTransform: 'uppercase'
                }}>
                  {call.priority}
                </span>
              </div>
              <span style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {getTimeAgo(call.timestamp)}
              </span>
            </div>

            {/* Address */}
            <div style={{ marginBottom: '8px' }}>
              <p style={{
                margin: '0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                📍 {call.address}
              </p>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '8px' }}>
              <p style={{
                margin: '0',
                fontSize: '13px',
                color: '#4b5563',
                lineHeight: '1.5'
              }}>
                {call.description}
              </p>
            </div>

            {/* Patient Info */}
            <div style={{
              display: 'flex',
              gap: '12px',
              fontSize: '12px',
              color: '#6b7280',
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb'
            }}>
              {call.patientInfo.age && (
                <span>👤 {call.patientInfo.age} anos</span>
              )}
              {call.patientInfo.gender && (
                <span>
                  {call.patientInfo.gender === 'M' ? '♂️' : '♀️'} {call.patientInfo.gender}
                </span>
              )}
            </div>

            {/* Action Button */}
            {selectedCall?.id === call.id && (
              <div style={{ marginTop: '12px' }}>
                <button
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }}
                >
                  Analisar Despacho
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


