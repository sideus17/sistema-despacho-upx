import { useEffect, useState } from 'react';
import { DispatchRecommendation, Ambulance, AmbulanceStatus, EmergencyCall } from '../types';
import { formatDistance, formatDuration, getTimeAgo } from '../services/api';
import { trafficNote } from '../utils/routes';
import { PRIORITY_META, waitingSince } from '../utils/calls';
import { PriorityLabel } from '../ui/PriorityLabel';
import { AmbulanceTypeIcon } from '../ui/AmbulanceTypeIcon';
import RouteNotes from './RouteNotes';
import { BackIcon, CheckCircleIcon, DistanceIcon, LocationIcon, StarIcon, TimerIcon } from '../ui/icons';
import { Avatar } from '../ui/Avatar';
import styles from './DispatchAnalysis.module.css';

interface DispatchAnalysisProps {
  call: EmergencyCall | null;
  recommendation: DispatchRecommendation | null;
  ambulances: Ambulance[];
  onExecuteDispatch: (ambulanceId: string) => Promise<void>;
  onBack: () => void;
  onRetry: () => void;
  loading?: boolean;
  selectedIndex?: number;
  routeLoadingId?: string | null;
  onSelectRoute: (index: number) => void;
}

export default function DispatchAnalysis({
  call,
  recommendation,
  ambulances,
  onExecuteDispatch,
  onBack,
  onRetry,
  loading = false,
  selectedIndex = 0,
  routeLoadingId,
  onSelectRoute
}: DispatchAnalysisProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  // Trocar de opção cancela uma confirmação em andamento
  useEffect(() => setConfirmingId(null), [selectedIndex, recommendation?.callId]);

  // A análise só abre por "Despachar"; sem chamado, ele saiu da fila enquanto a tela estava aberta
  if (!call) {
    return (
      <div className={styles.container}>
        <button className={styles.back} onClick={onBack}><BackIcon /> Voltar aos chamados</button>
        <p className={styles.notice} role="status">Este chamado não está mais na fila de despacho.</p>
      </div>
    );
  }

  const meta = PRIORITY_META[call.priority];
  // Espera pela viatura: desde a regulação (chamado de antes da regulação: desde a abertura)
  const timeAgo = getTimeAgo(waitingSince(call));
  const waiting = timeAgo === 'agora' ? 'aberto agora' : `aguardando há ${timeAgo.replace(' atrás', '')}`;

  const handleConfirm = async (ambulanceId: string) => {
    setExecuting(true);
    try {
      await onExecuteDispatch(ambulanceId);
    } finally {
      setExecuting(false);
      setConfirmingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={onBack}><BackIcon /> Voltar aos chamados</button>

      <section className={styles.callContext} style={{ '--priority-color': meta?.color } as React.CSSProperties}>
        <div className={styles.callContextHeader}>
          <span className={styles.priority}><PriorityLabel priority={call.priority} /></span>
          <span className={styles.waiting}>{waiting}</span>
        </div>
        <p className={styles.address}><LocationIcon /> {call.address}</p>
        {call.reference && <p className={styles.reference}>Referência: {call.reference}</p>}
        <p className={styles.description}>{call.description}</p>
      </section>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Analisando opções de despacho…</p>
        </div>
      )}

      {!loading && !recommendation && (
        <button className={styles.retry} onClick={onRetry}>Analisar despacho</button>
      )}

      {!loading && recommendation && recommendation.recommendations.length === 0 && (
        <p className={styles.notice} role="status">Nenhuma viatura com motorista em turno agora.</p>
      )}

      {!loading && recommendation && (
        <>
          <div className={styles.options}>
            {recommendation.recommendations.map((rec, index) => {
              const ambulance = ambulances.find(amb => amb.id === rec.ambulanceId);
              if (!ambulance) return null;

              const isSelected = selectedIndex === index;
              const isAvailable = ambulance.status === AmbulanceStatus.DISPONIVEL;
              const isConfirming = confirmingId === rec.ambulanceId;

              return (
                <article
                  key={rec.ambulanceId}
                  className={[
                    styles.option,
                    index === 0 ? styles.optionBest : '',
                    isSelected ? styles.optionSelected : ''
                  ].join(' ')}
                  onClick={() => onSelectRoute(index)}
                >
                  {index === 0 && <span className={styles.bestBadge}><StarIcon /> Recomendada</span>}

                  <header className={styles.optionHeader}>
                    <div className={styles.ambulance}>
                      <span className={styles.typeIcon}><AmbulanceTypeIcon type={ambulance.type} /></span>
                      <div>
                        <h3>{ambulance.code}</h3>
                        <p>{ambulance.type}{!isAvailable && ' · ocupada'}</p>
                        {ambulance.driver && (
                          <p className={styles.driver}>
                            <Avatar
                              name={ambulance.driver.name}
                              seed={ambulance.driver.id}
                              icon={ambulance.driver.avatar}
                              color={ambulance.driver.avatarColor}
                              size={20}
                            />
                            {ambulance.driver.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </header>

                  {rec.route ? (
                    <>
                      <div className={styles.route}>
                        <span><DistanceIcon /> <strong>{formatDistance(rec.route.distance)}</strong></span>
                        <span><TimerIcon /> <strong>{formatDuration(rec.route.duration)}</strong></span>
                        {trafficNote(rec.route) && <span>{trafficNote(rec.route)}</span>}
                      </div>
                      <div className={styles.routeNotes}><RouteNotes route={rec.route} /></div>
                    </>
                  ) : (
                    <div className={styles.routePending}>
                      {routeLoadingId === rec.ambulanceId ? 'Calculando rota…' : 'Toque para ver a rota no mapa'}
                    </div>
                  )}

                  <p className={styles.explanation}>{rec.explanation}</p>

                  {isSelected && (
                    <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                      {!isAvailable ? (
                        <button className={styles.execute} disabled>Ocupada — indisponível para despacho</button>
                      ) : isConfirming ? (
                        <div className={styles.confirmRow}>
                          <button
                            className={styles.execute}
                            disabled={executing}
                            onClick={() => handleConfirm(rec.ambulanceId)}
                          >
                            {executing ? 'Despachando…' : `Confirmar ${ambulance.code}`}
                          </button>
                          <button className={styles.cancel} disabled={executing} onClick={() => setConfirmingId(null)}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button className={styles.execute} onClick={() => setConfirmingId(rec.ambulanceId)}>
                          <CheckCircleIcon /> Executar despacho
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
