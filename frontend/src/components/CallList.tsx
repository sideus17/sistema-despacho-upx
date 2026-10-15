import { useState } from 'react';
import { EmergencyCall, CallStatus, Ambulance } from '../types';
import { getTimeAgo } from '../services/api';
import { PRIORITY_META, sortCallsByPriority, formatGender } from '../utils/calls';
import { PriorityLabel } from '../ui/PriorityLabel';
import { AmbulanceIcon, CheckCircleIcon, LocationIcon, PersonIcon } from '../ui/icons';
import styles from './CallList.module.css';

interface CallListProps {
  calls: EmergencyCall[];
  ambulances: Ambulance[];
  selectedCallId?: string;
  onFocus: (call: EmergencyCall) => void;
  onDispatch: (call: EmergencyCall) => void;
  onFinish: (call: EmergencyCall) => Promise<void>;
}

type Filter = 'all' | 'pending' | 'active';

export default function CallList({ calls, ambulances, selectedCallId, onFocus, onDispatch, onFinish }: CallListProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmingFinishId, setConfirmingFinishId] = useState<string | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);

  const pendingCalls = calls.filter(call => call.status === CallStatus.PENDENTE);
  const activeCalls = calls.filter(call => call.status === CallStatus.EM_ATENDIMENTO);
  // Pendentes (que exigem ação) sempre antes dos que já estão em atendimento
  const visibleCalls = [
    ...(filter !== 'active' ? sortCallsByPriority(pendingCalls) : []),
    ...(filter !== 'pending' ? sortCallsByPriority(activeCalls) : [])
  ];

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'Todos', count: pendingCalls.length + activeCalls.length },
    { key: 'pending', label: 'Pendentes', count: pendingCalls.length },
    { key: 'active', label: 'Em atendimento', count: activeCalls.length }
  ];

  const handleFinish = async (call: EmergencyCall) => {
    setFinishingId(call.id);
    try {
      await onFinish(call);
    } finally {
      setFinishingId(null);
      setConfirmingFinishId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.filters} role="tablist" aria-label="Filtrar chamados">
        {filters.map(f => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            className={`${styles.chip} ${filter === f.key ? styles.chipActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className={styles.chipCount}>{f.count}</span>
          </button>
        ))}
      </div>

      {visibleCalls.length === 0 ? (
        <p className={styles.empty}><CheckCircleIcon /> Nenhum chamado {filter === 'active' ? 'em atendimento' : 'pendente'}</p>
      ) : (
        <div className={styles.list}>
          {visibleCalls.map(call => {
            const meta = PRIORITY_META[call.priority];
            const isActive = call.status === CallStatus.EM_ATENDIMENTO;
            const assignedAmbulance = isActive ? ambulances.find(a => a.id === call.ambulance_id) : undefined;
            const gender = formatGender(call.patientInfo.gender);
            const isConfirming = confirmingFinishId === call.id;

            return (
              <article
                key={call.id}
                role="button"
                tabIndex={0}
                aria-label={`Chamado ${meta?.label} em ${call.address}`}
                className={[
                  styles.card,
                  isActive ? styles.cardActive : '',
                  selectedCallId === call.id ? styles.cardSelected : ''
                ].join(' ')}
                style={{ '--priority-color': meta?.color } as React.CSSProperties}
                onClick={() => onFocus(call)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onFocus(call);
                  }
                }}
              >
                <header className={styles.cardHeader}>
                  <span className={styles.priority}><PriorityLabel priority={call.priority} /></span>
                  <span className={styles.time}>{getTimeAgo(call.timestamp)}</span>
                </header>

                <p className={styles.address}><LocationIcon /> {call.address}</p>
                <p className={styles.description}>{call.description}</p>

                {(call.patientInfo.age || gender) && (
                  <div className={styles.patient}>
                    {call.patientInfo.age && <span><PersonIcon /> {call.patientInfo.age} anos</span>}
                    {gender && <span>{gender}</span>}
                  </div>
                )}

                <footer className={styles.actions} onClick={(e) => e.stopPropagation()}>
                  {!isActive && (
                    <button className={styles.primary} onClick={() => onDispatch(call)}>
                      Despachar
                    </button>
                  )}

                  {isActive && (
                    <>
                      <span className={styles.ambulanceBadge}><AmbulanceIcon /> {assignedAmbulance?.code ?? 'Viatura'} em atendimento</span>
                      {isConfirming ? (
                        <div className={styles.confirmRow}>
                          <button
                            className={styles.success}
                            disabled={finishingId === call.id}
                            onClick={() => handleFinish(call)}
                          >
                            {finishingId === call.id ? 'Finalizando…' : 'Confirmar'}
                          </button>
                          <button className={styles.ghost} onClick={() => setConfirmingFinishId(null)}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button className={styles.secondary} onClick={() => setConfirmingFinishId(call.id)}>
                          Finalizar atendimento
                        </button>
                      )}
                    </>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
