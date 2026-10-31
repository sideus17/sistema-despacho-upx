import { useEffect, useRef, useState } from 'react';
import { DispatchRecommendation, Ambulance, AmbulanceStatus, CallStatus, EmergencyCall } from '../types';
import { formatDistance, formatDuration } from '../services/api';
import { useNow } from '../hooks/useNow';
import { WaitPill } from '../ui/WaitPill';
import { trafficNote } from '../utils/routes';
import { STAGE_META, callStage, elapsedLabel, riskVars, waitingSince } from '../utils/calls';
import { AMBULANCE_TYPE_LABEL, staleLocationText } from '../utils/ambulances';
import { PriorityLabel } from '../ui/PriorityLabel';
import { AmbulanceTypeIcon } from '../ui/AmbulanceTypeIcon';
import RouteNotes from './RouteNotes';
import { BackIcon, DistanceIcon, LocationIcon, StarIcon, TimerIcon } from '../ui/icons';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { pressCtrlEnterAction } from '../ui/ctrlEnter';
import { styles } from './DispatchAnalysis.styles';

interface DispatchAnalysisProps {
  call: EmergencyCall | null;
  recommendation: DispatchRecommendation | null;
  ambulances: Ambulance[];
  calls?: EmergencyCall[]; // para dizer em que etapa está cada viatura ocupada
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
  calls = [],
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const now = useNow(1000);

  // Ao abrir o passo, o foco vai para o título (teclado e leitor de tela começam daqui)
  useEffect(() => titleRef.current?.focus(), [call?.id]);

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

  // Espera pela viatura: desde a regulação (chamado de antes da regulação: desde a abertura), no mesmo cronômetro da fila
  const waited = now - Date.parse(waitingSince(call));

  // Livres primeiro (o servidor já ordena assim); "Recomendada" é só a melhor livre
  const options = (recommendation?.recommendations ?? []).flatMap((rec, index) => {
    const ambulance = ambulances.find(amb => amb.id === rec.ambulanceId);
    return ambulance ? [{ rec, index, ambulance }] : [];
  });
  const free = options.filter(option => option.ambulance.status === AmbulanceStatus.DISPONIVEL);
  const busy = options.filter(option => option.ambulance.status !== AmbulanceStatus.DISPONIVEL);
  const bestIndex = free[0]?.index;

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
    <div className={styles.container} onKeyDown={pressCtrlEnterAction}>
      <button className={styles.back} onClick={onBack}><BackIcon /> Voltar aos chamados</button>
      <h2 ref={titleRef} tabIndex={-1} className={styles.title}>Despacho</h2>

      <section className={styles.callContext} style={riskVars(call.priority)}>
        <div className={styles.callContextHeader}>
          <span className={styles.priority}><PriorityLabel priority={call.priority} /></span>
          <WaitPill waited={waited} queue="despacho" priority={call.priority} />
        </div>
        <p className={styles.address}><LocationIcon /> {call.address}</p>
        {call.reference && <p className={styles.reference}>Referência: {call.reference}</p>}
        <p className={styles.description}>{call.description}</p>
      </section>

      {loading && (
        <div className={styles.loading}>
          <Spinner className={styles.spinner} label="Analisando" />
          <p>Analisando opções de despacho…</p>
        </div>
      )}

      {!loading && !recommendation && (
        <button className={styles.retry} onClick={onRetry}>Analisar despacho</button>
      )}

      {!loading && recommendation && options.length === 0 && (
        <p className={styles.notice} role="status">Nenhuma viatura com motorista em turno agora.</p>
      )}

      {/* Sem viatura livre: o próximo passo é voltar à fila, não um botão desativado */}
      {!loading && recommendation && options.length > 0 && free.length === 0 && (
        <section className={styles.noFree} role="status">
          <p className={styles.noFreeTitle}>Nenhuma viatura livre agora.</p>
          <p>O chamado continua na fila de despacho. Você é avisado quando uma viatura ficar livre.</p>
          <button className={styles.execute} onClick={onBack}>Voltar à fila</button>
        </section>
      )}

      {!loading && free.length > 0 && (
        <>
          <div className={styles.options}>
            {free.map(({ rec, index, ambulance }) => {
              const isSelected = selectedIndex === index;
              const isBest = index === bestIndex;
              const isConfirming = confirmingId === rec.ambulanceId;

              return (
                <article
                  key={rec.ambulanceId}
                  className={styles.option}
                  data-best={isBest || undefined}
                  data-selected={isSelected || undefined}
                  onClick={() => onSelectRoute(index)}
                >
                  {isBest && <span className={styles.bestBadge}><StarIcon /> Recomendada</span>}

                  <header className={styles.optionHeader}>
                    {/* O cartão todo responde ao clique; o botão é o caminho pelo teclado */}
                    <button
                      type="button"
                      className={styles.ambulance}
                      aria-pressed={isSelected}
                      aria-label={`Ver ${ambulance.code}${isBest ? ' (recomendada)' : ''}`}
                      onClick={event => {
                        event.stopPropagation();
                        onSelectRoute(index);
                      }}
                    >
                      <span className={styles.typeIcon}><AmbulanceTypeIcon type={ambulance.type} /></span>
                      <span className={styles.ambulanceText}>
                        <span className={styles.code}>{ambulance.code}</span>
                        <span className={styles.meta}>{AMBULANCE_TYPE_LABEL[ambulance.type] ?? ambulance.type}</span>
                        {ambulance.driver && (
                          <span className={styles.driver}>
                            <Avatar
                              name={ambulance.driver.name}
                              seed={ambulance.driver.id}
                              photo={ambulance.driver.avatarPhoto}
                              color={ambulance.driver.avatarColor}
                              size={20}
                            />
                            {ambulance.driver.name}
                          </span>
                        )}
                      </span>
                    </button>
                  </header>

                  {/* Distância e tempo saem da última posição: com o GPS parado, ela pode estar longe da real */}
                  {staleLocationText(ambulance, now) && (
                    <p className={styles.staleNote}>{staleLocationText(ambulance, now)}: distância a partir da última posição</p>
                  )}

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
                      {routeLoadingId === rec.ambulanceId ? 'Calculando rota…' : 'Clique para ver a rota no mapa'}
                    </div>
                  )}

                  <p className={styles.explanation}>{rec.explanation}</p>

                  {isSelected && (
                    <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                      {isConfirming ? (
                        <div className={styles.confirmRow}>
                          <button
                            className={styles.execute}
                            disabled={executing}
                            data-ctrl-enter
                            onClick={() => handleConfirm(rec.ambulanceId)}
                          >
                            {executing ? 'Despachando…' : `Confirmar ${ambulance.code}`}
                          </button>
                          <button className={styles.cancel} disabled={executing} onClick={() => setConfirmingId(null)}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button className={styles.execute} data-ctrl-enter aria-keyshortcuts="Control+Enter" onClick={() => setConfirmingId(rec.ambulanceId)}>
                          Despachar {ambulance.code}
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

      {/* Ocupadas: só para saber onde estão; não dá para despachar */}
      {!loading && busy.length > 0 && (
        <section className={styles.busy} aria-labelledby="ocupadas">
          <h3 id="ocupadas" className={styles.busyTitle}>Em atendimento</h3>
          <ul className={styles.busyList}>
            {busy.map(({ rec, ambulance }) => {
              const serving = calls.find(item => item.ambulance_id === ambulance.id && item.status === CallStatus.EM_ATENDIMENTO);
              const stage = serving ? callStage(serving) : null;
              return (
                <li key={rec.ambulanceId} className={styles.busyItem}>
                  <AmbulanceTypeIcon type={ambulance.type} />
                  <strong>{ambulance.code}</strong>
                  <span>
                    {AMBULANCE_TYPE_LABEL[ambulance.type] ?? ambulance.type}
                    {stage ? ` · ${STAGE_META[stage.stage].label} ${elapsedLabel(stage.since, Date.now())}` : ' · em atendimento'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
