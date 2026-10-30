import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { CallPriority, CallStatus, CloseReason, EmergencyCall, Hospital, RegulationDecision, RegulationRequest } from '../types';
import { getErrorMessage, regulateCall } from '../services/api';
import { CALL_STATUS_LABEL, CLOSE_REASON_LABEL, PRIORITIES_BY_SEVERITY, PRIORITY_META, formatGender, queueOf, riskVars, waitingSince } from '../utils/calls';
import { formatKm, hospitalsByDistance } from '../utils/hospitals';
import { formatPhone } from '../utils/documents';
import { useNow } from '../hooks/useNow';
import { PriorityLabel } from '../ui/PriorityLabel';
import { BackIcon, CallIcon, LocationIcon, PersonIcon } from '../ui/icons';
import { pressCtrlEnterAction } from '../ui/ctrlEnter';
import { WaitPill } from '../ui/WaitPill';
import { Select } from '../ui/Select';
import RiskClassification from './RiskClassification';
import { useToast } from './Toast';
import styles from './RegulationPanel.module.css';

interface RegulationPanelProps {
  // O chamado como está agora (a lista atualiza a cada 10 s); null: saiu das filas
  call: EmergencyCall | null;
  hospitals: Hospital[];
  onDone: (call: EmergencyCall, decision: RegulationDecision) => void;
  onBack: () => void;
}

type Mode = 'main' | 'orientacao' | 'cancelar';

const MAX_NOTE = 500;

// Regulação: confirmar ou mudar a cor, escolher o hospital e decidir se vai viatura,
// se o caso se resolve com orientação por telefone ou se o chamado é cancelado
export default function RegulationPanel(props: RegulationPanelProps) {
  if (props.call) return <RegulationForm {...props} call={props.call} />;
  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={props.onBack}><BackIcon /> Voltar aos chamados</button>
      <p className={styles.notice} role="status">Este chamado não está mais nas filas: outra pessoa já o encerrou.</p>
    </div>
  );
}

function RegulationForm({ call, hospitals, onDone, onBack }: RegulationPanelProps & { call: EmergencyCall }) {
  // Status de quando o painel abriu: se mudar, outra pessoa regulou ou despachou enquanto isso
  const [openedStatus] = useState(call.status);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Ao abrir o passo, o foco vai para o título (teclado e leitor de tela começam daqui)
  useEffect(() => titleRef.current?.focus(), []);
  const [priority, setPriority] = useState<CallPriority>(call.priority);
  const [hospitalId, setHospitalId] = useState(call.hospitalId ?? '');
  const [mode, setMode] = useState<Mode>('main');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<CloseReason | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const now = useNow(1000);
  const reasonsRef = useRef<HTMLFieldSetElement>(null);
  // Ao abrir "Cancelar chamado", o foco vai para o primeiro motivo
  useEffect(() => {
    if (mode === 'cancelar') reasonsRef.current?.querySelector('input')?.focus();
  }, [mode]);
  // Vermelho ou Amarelo encerrado sem viatura ou cancelado pede um passo a mais (vale a cor final, a escolhida agora)
  const [confirmingClose, setConfirmingClose] = useState(false);
  const severe = priority === CallPriority.EMERGENCIA || priority === CallPriority.URGENTE;
  useEffect(() => setConfirmingClose(false), [priority, mode]);
  // Na confirmação, o foco vai para a saída segura (o clique tirava o botão e o foco caía no body)
  const safeChoiceRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirmingClose) safeChoiceRef.current?.focus();
  }, [confirmingClose]);
  // "Enviar viatura" na confirmação volta ao passo principal com o foco no botão de enviar
  const mainActionRef = useRef<HTMLButtonElement>(null);
  const focusMainAction = useRef(false);
  useEffect(() => {
    if (mode === 'main' && focusMainAction.current) {
      focusMainAction.current = false;
      mainActionRef.current?.focus();
    }
  }, [mode]);

  const queue = queueOf(call);
  const changedElsewhere = call.status !== openedStatus;
  const regulated = openedStatus === CallStatus.PENDENTE;
  const waited = now - Date.parse(waitingSince(call));
  const gender = formatGender(call.patientInfo.gender);
  // Cor dada no registro (antes de qualquer regulação), para a linha "Registrado: … → Final: …"
  const registeredPriority = call.initialPriority ?? call.priority;

  const submit = async (decision: RegulationDecision) => {
    const request: RegulationRequest = { decision, priority };
    if (decision === RegulationDecision.DESPACHAR) request.hospitalId = hospitalId || null;
    if (decision !== RegulationDecision.DESPACHAR && note.trim()) request.note = note.trim();
    if (decision === RegulationDecision.CANCELAR && reason) request.reason = reason;

    setBusy(true);
    try {
      onDone(await regulateCall(call.id, request), decision);
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível salvar a regulação.'), 'error');
      setBusy(false);
    }
  };

  if (changedElsewhere || !queue) {
    return (
      <div className={styles.container}>
        <button className={styles.back} onClick={onBack}><BackIcon /> Voltar aos chamados</button>
        <p className={styles.notice} role="status">
          Este chamado mudou enquanto você regulava: agora está <strong>{CALL_STATUS_LABEL[call.status].toLowerCase()}</strong>.
        </p>
      </div>
    );
  }

  const cancelReady = !!reason && (reason !== CloseReason.OUTRO || !!note.trim());

  // Volta ao passo principal com o foco no botão de seguir (saída segura das confirmações)
  const backToMain = () => {
    focusMainAction.current = true;
    setMode('main');
  };

  // Teclado do painel: 1 a 4 escolhem a cor; fora do passo principal, o Esc fecha a confirmação ou volta a ele
  // (no passo principal, o Esc é da central e volta à lista). Nos campos de texto, as teclas são do campo
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    pressCtrlEnterAction(event);
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.closest('textarea, select, input:not([type="radio"])')) return;
    if (event.key === 'Escape' && mode !== 'main') {
      event.preventDefault();
      if (confirmingClose) setConfirmingClose(false);
      else backToMain();
      return;
    }
    const index = Number(event.key) - 1;
    if (mode !== 'cancelar' && index >= 0 && index < PRIORITIES_BY_SEVERITY.length) {
      event.preventDefault();
      setPriority(PRIORITIES_BY_SEVERITY[index]);
    }
  };

  return (
    <div className={styles.container} onKeyDown={handleKeyDown}>
      <button className={styles.back} onClick={onBack}><BackIcon /> Voltar aos chamados</button>
      <h2 ref={titleRef} tabIndex={-1} className={styles.title}>{regulated ? 'Reclassificar chamado' : 'Regulação'}</h2>

      <section className={styles.summary} style={riskVars(priority)}>
        <div className={styles.summaryHeader}>
          <PriorityLabel priority={priority} />
          <WaitPill waited={waited} queue={queue} priority={registeredPriority} />
        </div>
        {registeredPriority !== priority && (
          <p className={styles.muted}>
            Registrado: {PRIORITY_META[registeredPriority].name} → Final: <strong>{PRIORITY_META[priority].name}</strong>
          </p>
        )}
        <p className={styles.address}><LocationIcon /> {call.address}</p>
        {call.reference && <p className={styles.muted}>Referência: {call.reference}</p>}
        <p className={styles.description}>{call.description}</p>
        {(call.patientInfo.age || gender || call.callerPhone) && (
          <p className={styles.patient}>
            {call.patientInfo.age && <span><PersonIcon /> {call.patientInfo.age} anos</span>}
            {gender && <span>{gender}</span>}
            {call.callerPhone && (
              <a href={`tel:${call.callerPhone}`} title="Ligar para quem chamou"><CallIcon /> {formatPhone(call.callerPhone)}</a>
            )}
          </p>
        )}
      </section>

      {/* Para cancelar, a cor não importa: a escolha sai da tela (e vai a cor que já estava) */}
      {mode !== 'cancelar' && (
        <RiskClassification
          legend="Cor final"
          signals={call.triage?.signals ?? []}
          value={priority}
          onChange={setPriority}
          suggested={call.triage?.suggested ?? null}
          numberKeys
        />
      )}

      {mode === 'main' && (
        <>
          <Select
            className={styles.field}
            label={<>Hospital de destino <em>(opcional)</em></>}
            value={hospitalId}
            disabled={hospitals.length === 0}
            onChange={setHospitalId}
            options={[
              { value: '', label: hospitals.length === 0 ? 'Carregando…' : 'Sem escolha (a equipe decide)' },
              ...hospitalsByDistance(hospitals, call.location).map(({ hospital, meters }) => ({
                value: hospital.id,
                label: `${hospital.shortName} · ${formatKm(meters)}`
              }))
            ]}
          />

          <div className={styles.actions}>
            <button
              ref={mainActionRef}
              className={styles.primary}
              disabled={busy}
              data-ctrl-enter
              aria-keyshortcuts="Control+Enter"
              onClick={() => submit(RegulationDecision.DESPACHAR)}
            >
              {busy ? 'Salvando…' : regulated ? 'Salvar regulação' : 'Seguir para o despacho'}
            </button>
            <div className={styles.secondaryRow}>
              <button className={styles.secondary} disabled={busy} onClick={() => setMode('orientacao')}>Orientação por telefone</button>
              <button className={styles.secondary} disabled={busy} onClick={() => setMode('cancelar')}>Cancelar chamado</button>
            </div>
          </div>
        </>
      )}

      {mode === 'orientacao' && (
        <div className={styles.closing}>
          <label className={styles.field}>
            <span>Orientação dada por telefone</span>
            <textarea
              rows={3}
              maxLength={MAX_NOTE}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: procurar a UBS amanhã; ligar de novo se piorar"
              autoFocus
            />
          </label>
          {confirmingClose ? (
            <div className={styles.confirmSevere} role="alert">
              <p>
                <strong>{PRIORITY_META[priority].name} · {PRIORITY_META[priority].label} sem viatura.</strong> Encerrar mesmo assim?
              </p>
              <div className={styles.secondaryRow}>
                <button ref={safeChoiceRef} className={styles.primary} disabled={busy} onClick={backToMain}>
                  Enviar viatura
                </button>
                <button className={styles.danger} disabled={busy} onClick={() => submit(RegulationDecision.ORIENTACAO)}>
                  {busy ? 'Salvando…' : 'Sim, encerrar sem viatura'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={styles.muted}>O chamado é encerrado sem viatura.</p>
              <div className={styles.secondaryRow}>
                <button
                  className={styles.primary}
                  disabled={busy || !note.trim()}
                  data-ctrl-enter
                  onClick={() => (severe ? setConfirmingClose(true) : submit(RegulationDecision.ORIENTACAO))}
                >
                  {busy ? 'Salvando…' : 'Encerrar com orientação'}
                </button>
                <button className={styles.ghost} disabled={busy} onClick={() => setMode('main')}>Voltar</button>
              </div>
            </>
          )}
        </div>
      )}

      {mode === 'cancelar' && (
        <div className={styles.closing}>
          <fieldset ref={reasonsRef} className={styles.reasons}>
            <legend>Motivo do cancelamento</legend>
            {Object.values(CloseReason).map(option => (
              <label key={option} className={styles.reason}>
                <input type="radio" name="close-reason" checked={reason === option} onChange={() => setReason(option)} />
                {CLOSE_REASON_LABEL[option]}
              </label>
            ))}
          </fieldset>
          <label className={styles.field}>
            <span>Observação {reason === CloseReason.OUTRO ? '' : <em>(opcional)</em>}</span>
            <textarea rows={2} maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {confirmingClose ? (
            // Caso grave: cancelar pede confirmação; a saída segura não cancela (um repetido não pede viatura)
            <div className={styles.confirmSevere} role="alert">
              <p>
                <strong>{PRIORITY_META[priority].name} · {PRIORITY_META[priority].label}:</strong> cancelar o chamado?
              </p>
              <div className={styles.secondaryRow}>
                <button ref={safeChoiceRef} className={styles.primary} disabled={busy} onClick={backToMain}>
                  Não cancelar
                </button>
                <button className={styles.danger} disabled={busy} onClick={() => submit(RegulationDecision.CANCELAR)}>
                  {busy ? 'Cancelando…' : 'Sim, cancelar'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.secondaryRow}>
              <button
                className={styles.danger}
                disabled={busy || !cancelReady}
                data-ctrl-enter
                onClick={() => (severe ? setConfirmingClose(true) : submit(RegulationDecision.CANCELAR))}
              >
                {busy ? 'Cancelando…' : 'Cancelar chamado'}
              </button>
              <button className={styles.ghost} disabled={busy} onClick={() => setMode('main')}>Voltar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
