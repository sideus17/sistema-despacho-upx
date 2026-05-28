import { useState } from 'react';
import { EmergencyCall, CallPriority, CallStatus, Ambulance } from '../types';
import { getTimeAgo, finishDispatch } from '../services/api';

interface CallListProps {
  calls: EmergencyCall[];
  ambulances: Ambulance[];
  onCallSelect: (call: EmergencyCall) => void;
}

export default function CallList({ calls, ambulances, onCallSelect }: CallListProps) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  const getPriorityColor = (priority: CallPriority): string => {
    switch (priority) {
      case CallPriority.EMERGENCIA: return '#dc2626';
      case CallPriority.URGENTE: return '#f59e0b';
      case CallPriority.PRIORITARIO: return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const handleFinish = async (callId: string, ambulanceId: string) => {
    try {
      await finishDispatch(callId, ambulanceId);
      alert('Atendimento finalizado com sucesso!');
      window.location.reload(); 
    } catch (error) {
      alert('Erro ao finalizar atendimento');
    }
  };

  const getPriorityBadge = (priority: CallPriority): string => {
    switch (priority) {
      case CallPriority.EMERGENCIA: return '🚨';
      case CallPriority.URGENTE: return '⚠️';
      case CallPriority.PRIORITARIO: return 'ℹ️';
      default: return '📋';
    }
  };

  const activeCalls = calls.filter(call => 
    call.status === CallStatus.PENDENTE || call.status === CallStatus.EM_ATENDIMENTO
  );

  if (activeCalls.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        <p style={{ fontSize: '16px', margin: '0' }}>✅ Nenhum chamado pendente</p>
      </div>
    );
  }

  console.log('Chamados:', activeCalls);
  console.log('Ambulâncias disponíveis:', ambulances);

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
        Chamados ({activeCalls.length})
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeCalls.map(call => {
          const isExpanded = expandedCallId === call.id;
          const isEmAtendimento = call.status === CallStatus.EM_ATENDIMENTO;
          const ambId = call.ambulance_id;      
          const assignedAmbulance = (isEmAtendimento && ambId) ? ambulances.find(a => a.id === ambId) : null;

          return (
            <div
              key={call.id}
              onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
              style={{
                padding: '16px',
                backgroundColor: isEmAtendimento ? '#fff7ed' : (isExpanded ? '#eff6ff' : 'white'),
                border: isExpanded ? '2px solid #3b82f6' : (isEmAtendimento ? '1px solid #fdba74' : '1px solid #e5e7eb'),
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isExpanded ? '0 4px 6px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{getPriorityBadge(call.priority)}</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: getPriorityColor(call.priority), textTransform: 'uppercase' }}>
                    {call.priority}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{getTimeAgo(call.timestamp)}</span>
                  
                  {/* Badge visual para indicar que o chamado já está rodando */}
                  {isEmAtendimento && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '10px', backgroundColor: '#f97316', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        EM ATENDIMENTO
                      </span>
                      {/* O CÓDIGO DA AMBULÂNCIA APARECE AQUI */}
                      {assignedAmbulance && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#c2410c', backgroundColor: '#ffedd5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fed7aa' }}>
                          🚑 {assignedAmbulance.code}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div style={{ marginBottom: '8px' }}>
                <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>📍 {call.address}</p>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '8px' }}>
                <p style={{ margin: '0', fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>{call.description}</p>
              </div>

              {/* Patient Info */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                {call.patientInfo.age && <span>👤 {call.patientInfo.age} anos</span>}
                {call.patientInfo.gender && <span>{call.patientInfo.gender === 'M' ? '♂️' : '♀️'} {call.patientInfo.gender}</span>}
              </div>

              {/* Action Buttons Container */}
              {isExpanded && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {call.status === CallStatus.PENDENTE && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCallSelect(call);
                      }}
                      style={{ width: '100%', padding: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Analisar Despacho
                    </button>
                  )}

                  {call.status === CallStatus.EM_ATENDIMENTO && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFinish(call.id, ambId!);
                      }}
                      style={{ width: '100%', padding: '8px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Finalizar Atendimento
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}