import { useEffect, useRef, useState } from 'react';
import { EmergencyCall, CallStatus, Ambulance, CallOutcome, Hospital } from '../types';
import {
  PRIORITY_META,
  STAGE_META,
  callStage,
  crewAck,
  elapsedLabel,
  formatClock,
  formatGender,
  lateSummary,
  needsOutcome,
  riskVars,
  queueOf,
  sortCallsByPriority,
  timeline,
  waitingSince
} from '../utils/calls';
import { formatKm, hospitalsByDistance } from '../utils/hospitals';
import { useNow } from '../hooks/useNow';
import { setCallAlertsEnabled, useCallAlertsEnabled } from '../hooks/useCallAlerts';
import { PriorityLabel } from '../ui/PriorityLabel';
import { OutcomeChoice } from '../ui/OutcomeChoice';
import { signalsText } from '../utils/triage';
import { formatPhone } from '../utils/documents';
import { AmbulanceIcon, BellIcon, BellOffIcon, CallIcon, CheckCircleIcon, LocationIcon, PersonIcon, WarningIcon } from '../ui/icons';
import { WaitPill } from '../ui/WaitPill';
import styles from './CallList.module.css';

interface CallListProps {
  calls: EmergencyCall[];
  ambulances: Ambulance[];
  selectedCallId?: string;
  onFocus: (call: EmergencyCall) => void;
  onRegulate: (call: EmergencyCall) => void;
  onDispatch: (call: EmergencyCall) => void;
  onFinish: (call: EmergencyCall, outcome?: CallOutcome) => Promise<void>;
  hospitals?: Hospital[];
  onHospitalChange?: (call: EmergencyCall, hospitalId: string | null) => void | Promise<void>;
  focusCallId?: string | null; // voltando da regulação ou da análise: o foco volta a este cartão
  onFocusRestored?: () => void;
}

type Filter = 'all' | 'regulation' | 'dispatch' | 'active';

// Quanto dura o realce do cartão de um chamado que acabou de chegar
const FRESH_MS = 2000;

const EMPTY: Record<Filter, string> = {
  all: 'Nenhum chamado em aberto',
  regulation: 'Nenhum chamado aguardando regulação',
  dispatch: 'Nenhum chamado aguardando despacho',
  active: 'Nenhum chamado em atendimento'
};

export default function CallList({
  calls,
  ambulances,
  selectedCallId,
  onFocus,
  onRegulate,
  onDispatch,
  onFinish,
  hospitals = [],
  onHospitalChange,
  focusCallId,
  onFocusRestored
}: CallListProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmingFinishId, setConfirmingFinishId] = useState<string | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Voltando da regulação ou da análise, o foco volta ao cartão de onde se saiu (teclado e leitor de tela)
  useEffect(() => {
    if (!focusCallId) return;
    containerRef.current?.querySelector<HTMLElement>(`[data-call-id="${focusCallId}"] [data-card-button]`)?.focus();
    onFocusRestored?.();
  }, []);

  // Cronômetro de espera e tempo na etapa, ao vivo, só enquanto há chamado na lista
  const now = useNow(1000, calls.length > 0);
  // Chamado que entrou na lista depois de ela abrir: o cartão nasce com um realce de fundo que some em 2 s
  // (sem movimento: a fila que se mexe faria o clique cair no chamado errado)
  const firstSeen = useRef<Map<string, number> | null>(null);
  if (firstSeen.current === null) firstSeen.current = new Map(calls.map(call => [call.id, 0]));
  for (const call of calls) if (!firstSeen.current.has(call.id)) firstSeen.current.set(call.id, Date.now());
  const isFresh = (id: string) => Date.now() - (firstSeen.current?.get(id) ?? 0) < FRESH_MS;
  const late = lateSummary(calls, now);
  const alertsOn = useCallAlertsEnabled();
  // Na ordem do trabalho: regulação, despacho e os que já estão com uma viatura
  const byStatus = (status: CallStatus) => sortCallsByPriority(calls.filter(call => call.status === status));
  const sections: Array<{ key: Exclude<Filter, 'all'>; title: string; calls: EmergencyCall[] }> = [
    { key: 'regulation', title: 'Aguardando regulação', calls: byStatus(CallStatus.AGUARDANDO_REGULACAO) },
    { key: 'dispatch', title: 'Aguardando despacho', calls: byStatus(CallStatus.PENDENTE) },
    { key: 'active', title: 'Em atendimento', calls: byStatus(CallStatus.EM_ATENDIMENTO) }
  ];
  const visibleSections = sections.filter(section => (filter === 'all' || filter === section.key) && section.calls.length > 0);

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'Todos', count: sections.reduce((total, section) => total + section.calls.length, 0) },
    { key: 'regulation', label: 'Regulação', count: sections[0].calls.length },
    { key: 'dispatch', label: 'Despacho', count: sections[1].calls.length },
    { key: 'active', label: 'Em atendimento', count: sections[2].calls.length }
  ];

  const handleFinish = async (call: EmergencyCall, outcome?: CallOutcome) => {
    setFinishingId(call.id);
    try {
      await onFinish(call, outcome);
    } finally {
      setFinishingId(null);
      setConfirmingFinishId(null);
    }
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filtrar chamados">
          {filters.map(f => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              className={`${styles.chip} ${filter === f.key ? styles.chipActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className={styles.chipCount}>{f.count}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${styles.alerts} ${alertsOn ? styles.alertsOn : ''}`}
          aria-pressed={alertsOn}
          onClick={() => setCallAlertsEnabled(!alertsOn)}
          title={alertsOn ? 'Som e notificação ligados para chamado novo, chamado regulado e espera longa' : 'Som e notificação desligados'}
        >
          {alertsOn ? <BellIcon /> : <BellOffIcon />} Alertas
        </button>
      </div>

      {/* Espera longa: o resumo fica na própria fila (some sozinho), em vez de um aviso por cima do mapa */}
      {late.length > 0 && (
        <div className={styles.late} role="status">
          {late.map(line => <p key={line}><WarningIcon /> {line}</p>)}
        </div>
      )}

      {visibleSections.length === 0 ? (
        <p className={styles.empty}><CheckCircleIcon /> {EMPTY[filter]}</p>
      ) : visibleSections.map(section => (
        <section key={section.key} className={styles.section} aria-label={section.title}>
          {filter === 'all' && <h3 className={styles.sectionTitle}>{section.title} <span>{section.calls.length}</span></h3>}
          <div className={styles.list}>
            {section.calls.map(call => {
              const meta = PRIORITY_META[call.priority];
              const isActive = call.status === CallStatus.EM_ATENDIMENTO;
              const queue = queueOf(call);
              const waited = now - Date.parse(waitingSince(call));
              const assignedAmbulance = isActive ? ambulances.find(a => a.id === call.ambulance_id) : undefined;
              const gender = formatGender(call.patientInfo.gender);
              const isConfirming = confirmingFinishId === call.id;
              const stage = isActive ? callStage(call) : null;
              const ack = isActive ? crewAck(call, now) : null;
              const stageMeta = stage ? STAGE_META[stage.stage] : null;
              const hospital = hospitals.find(item => item.id === call.hospitalId);

              return (
                // O cartão todo responde ao clique (mouse); pelo teclado e pelo leitor de tela, o endereço é o botão
                <article
                  key={call.id}
                  data-call-id={call.id}
                  className={[
                    styles.card,
                    selectedCallId === call.id ? styles.cardSelected : '',
                    isFresh(call.id) ? styles.cardFresh : ''
                  ].join(' ')}
                  style={riskVars(call.priority)}
                  onClick={() => onFocus(call)}
                >
                  <header className={styles.cardHeader}>
                    <span className={styles.priority}>
                      <PriorityLabel priority={call.priority} />
                      {queue === 'regulacao' && <span className={styles.suggestedTag} title="Cor do registro; a final sai na regulação">sugerida</span>}
                    </span>
                    {stage && stageMeta ? (
                      // Em atendimento: etapa marcada pelo GPS da viatura e há quanto tempo
                      <span className={styles.stage}>
                        {stageMeta.label}{stage.stage === 'TRANSPORTANDO' && hospital ? ` → ${hospital.shortName}` : ''} · {elapsedLabel(stage.since, now)}
                      </span>
                    ) : (
                      // Na fila: há quanto tempo espera a regulação (desde a abertura) ou a viatura (desde a regulação)
                      <WaitPill waited={waited} queue={queue ?? 'despacho'} />
                    )}
                  </header>

                  <p className={styles.address}>
                    <button
                      type="button"
                      className={styles.cardButton}
                      data-card-button
                      aria-label={`${meta ? `${meta.name} · ${meta.label}` : call.priority}: ${call.address}`}
                      onClick={event => {
                        event.stopPropagation();
                        onFocus(call);
                      }}
                    >
                      <LocationIcon /> {call.address}
                    </button>
                  </p>
                  {ack && (
                    <p className={`${styles.crewAck} ${!ack.seen && ack.late ? styles.crewAckLate : ''}`}>
                      {ack.seen
                        ? `Equipe ciente às ${formatClock(ack.at)}`
                        : ack.late
                          ? <><WarningIcon /> Equipe ainda não confirmou: ligue para a viatura</>
                          : 'Aguardando a equipe confirmar'}
                    </p>
                  )}
                  {call.reference && <p className={styles.reference}>Referência: {call.reference}</p>}
                  <p className={styles.description}>{call.description}</p>
                  {call.triage?.signals.length ? <p className={styles.signals}>Sinais: {signalsText(call.triage.signals)}</p> : null}

                  {(call.patientInfo.age || gender || call.callerPhone) && (
                    <div className={styles.patient}>
                      {call.patientInfo.age && <span><PersonIcon /> {call.patientInfo.age} anos</span>}
                      {gender && <span>{gender}</span>}
                      {call.callerPhone && <span title="Telefone de quem ligou"><CallIcon /> {formatPhone(call.callerPhone)}</span>}
                    </div>
                  )}

                  {isActive && (
                    <div className={styles.progress} onClick={(e) => e.stopPropagation()}>
                      {timeline(call).length > 0 && (
                        <p className={styles.timeline}>{timeline(call).map(step => `${step.label} ${step.time}`).join(' · ')}</p>
                      )}
                      {call.times?.atHospital ? (
                        <p className={styles.hospitalDone}>
                          Hospital: <strong>{hospital?.shortName ?? 'registrado'}</strong> (chegou às {formatClock(call.times.atHospital)})
                        </p>
                      ) : (
                        <HospitalPick call={call} hospitals={hospitals} onSave={onHospitalChange} />
                      )}
                    </div>
                  )}

                  <footer className={styles.actions} onClick={(e) => e.stopPropagation()}>
                    {queue === 'regulacao' && (
                      <button className={styles.primary} title="Regular (R)" aria-keyshortcuts="R" onClick={() => onRegulate(call)}>
                        Regular
                      </button>
                    )}
                    {queue === 'despacho' && (
                      <div className={styles.confirmRow}>
                        <button className={styles.primary} title="Despachar (D)" aria-keyshortcuts="D" onClick={() => onDispatch(call)}>
                          Despachar
                        </button>
                        <button className={styles.ghost} title="Reclassificar (R)" aria-keyshortcuts="R" onClick={() => onRegulate(call)}>
                          Reclassificar
                        </button>
                      </div>
                    )}

                    {isActive && (
                      <>
                        <span className={styles.ambulanceBadge}><AmbulanceIcon /> {assignedAmbulance?.code ?? 'Viatura'} em atendimento</span>
                        {isConfirming && needsOutcome(call) ? (
                          <OutcomeChoice
                            busy={finishingId === call.id}
                            onChoose={outcome => handleFinish(call, outcome)}
                            onCancel={() => setConfirmingFinishId(null)}
                          />
                        ) : isConfirming ? (
                          <div className={styles.confirmRow}>
                            <button
                              className={styles.primary}
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
                          <button className={styles.ghost} onClick={() => setConfirmingFinishId(call.id)}>
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
        </section>
      ))}

      <p className={styles.shortcuts}>Atalhos: N novo chamado · J e K próximo e anterior · R regular · D despachar · Esc voltar</p>
    </div>
  );
}

// Hospital de destino do chamado em atendimento: a troca no seletor é um rascunho e só vale no "Salvar destino"
// (com as setas do teclado, cada opção salvaria e avisaria a equipe de um destino novo)
function HospitalPick({ call, hospitals, onSave }: {
  call: EmergencyCall;
  hospitals: Hospital[];
  onSave?: (call: EmergencyCall, hospitalId: string | null) => void | Promise<void>;
}) {
  const saved = call.hospitalId ?? '';
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  // Mudou fora daqui (a equipe ou outra tela escolheu, ou acabou de salvar): o rascunho acompanha
  useEffect(() => setDraft(saved), [saved]);
  const changed = draft !== saved;

  const save = async () => {
    setSaving(true);
    try {
      await onSave?.(call, draft || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className={styles.hospitalPick}>
        <span>Hospital de destino</span>
        <select
          value={draft}
          disabled={!onSave || hospitals.length === 0 || saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Esc desfaz a troca ainda não salva (sem fechar o resto da tela)
            if (e.key === 'Escape' && changed) {
              e.stopPropagation();
              setDraft(saved);
            }
          }}
        >
          <option value="">{hospitals.length === 0 ? 'Carregando…' : 'Sem escolha (a equipe decide)'}</option>
          {hospitalsByDistance(hospitals, call.location).map(({ hospital: option, meters }) => (
            <option key={option.id} value={option.id}>{option.shortName} · {formatKm(meters)}</option>
          ))}
        </select>
      </label>
      {changed && (
        <div className={styles.hospitalSave}>
          <button type="button" className={styles.primary} disabled={saving} onClick={save}>
            {saving ? 'Salvando…' : 'Salvar destino'}
          </button>
          <button type="button" className={styles.ghost} disabled={saving} onClick={() => setDraft(saved)}>
            Desfazer
          </button>
        </div>
      )}
    </>
  );
}
