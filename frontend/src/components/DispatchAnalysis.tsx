import { useEffect, useState } from 'react';
import { DispatchRecommendation, Ambulance, AmbulanceStatus, EmergencyCall } from '../types';
import { formatDistance, formatDuration, getTimeAgo } from '../services/api';
import { PRIORITY_META } from '../utils/calls';
import { PriorityLabel } from '../ui/PriorityLabel';
import { AmbulanceTypeIcon } from '../ui/AmbulanceTypeIcon';
import RouteNotes from './RouteNotes';
import { AnalyticsIcon, BackIcon, CheckCircleIcon, DistanceIcon, LocationIcon, StarIcon, TimerIcon } from '../ui/icons';
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

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#16a34a';
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

  if (!call) {
    return (
      <p className={styles.empty}><AnalyticsIcon /> Escolha um chamado e toque em <strong>Despachar</strong> para ver a análise</p>
    );
  }

  const meta = PRIORITY_META[call.priority];
  const timeAgo = getTimeAgo(call.timestamp);
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

      {!loading && recommendation && (
        <>
          <p className={styles.algorithm}>
            Score: distância 40% · disponibilidade 30% · tipo 20% · ocorrências 10%
          </p>

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
                  {index === 0 && <span className={styles.bestBadge}><StarIcon /> Melhor opção</span>}

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
                    <div className={styles.score} style={{ color: getScoreColor(rec.totalScore) }}>
                      <strong>{rec.totalScore}</strong>
                      <span>{getScoreLabel(rec.totalScore)}</span>
                    </div>
                  </header>

                  <dl className={styles.breakdown}>
                    <div><dt>Distância</dt><dd>{rec.distanceScore}/100</dd></div>
                    <div><dt>Disponibilidade</dt><dd>{rec.availabilityScore}/100</dd></div>
                    <div><dt>Tipo</dt><dd>{rec.typeScore}/100</dd></div>
                    <div>
                      <dt>Ocorrências</dt>
                      <dd className={rec.incidentPenalty < 0 ? styles.negative : ''}>{rec.incidentPenalty}</dd>
                    </div>
                  </dl>

                  {rec.route ? (
                    <>
                      <div className={styles.route}>
                        <span><DistanceIcon /> <strong>{formatDistance(rec.route.distance)}</strong></span>
                        <span><TimerIcon /> <strong>{formatDuration(rec.route.duration)}</strong></span>
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
