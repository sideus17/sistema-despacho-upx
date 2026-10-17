import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { CallStatus, EmergencyCall, Hospital } from '../../types';
import { getCallEvents } from '../../services/api';
import { CALL_STATUS_LABEL, CLOSE_REASON_LABEL, OUTCOME_LABEL, PRIORITY_META, formatClock, formatGender } from '../../utils/calls';
import { callTimeline } from '../../utils/callEvents';
import { signalsText } from '../../utils/triage';
import { formatPhone } from '../../utils/documents';
import { PriorityLabel } from '../../ui/PriorityLabel';
import { useFocusTrap } from '../../ui/useFocusTrap';
import { CloseIcon } from '../../ui/icons';
import { formatMinutes } from './format';
import { useLoad } from './useLoad';
import styles from './CallDetail.module.css';

// "12/10, 10:43"
export const openedAt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const seconds = (from?: string, to?: string) => (from && to ? Math.max(0, (Date.parse(to) - Date.parse(from)) / 1000) : null);

// Tempo-resposta (abertura → local) e total (abertura → fim); sem o horário, nulo
export function callDurations(call: EmergencyCall): { response: number | null; total: number | null } {
  return { response: seconds(call.timestamp, call.times?.onScene), total: seconds(call.timestamp, call.times?.finished) };
}

// Desfecho para quem finalizou; o motivo, para o cancelado; senão, o status
export function resultLabel(call: EmergencyCall): string {
  if (call.status === CallStatus.FINALIZADO) return call.outcome ? OUTCOME_LABEL[call.outcome] : 'Finalizado';
  if (call.status === CallStatus.CANCELADO && call.closeReason) return `Cancelado · ${CLOSE_REASON_LABEL[call.closeReason]}`;
  return CALL_STATUS_LABEL[call.status] ?? call.status;
}

// Painel do chamado no histórico: à direita no computador, de baixo para cima no celular
export function CallDetail({ call, ambulanceCode, hospital, hospitals = [], onClose }: {
  call: EmergencyCall;
  ambulanceCode: string;
  hospital?: Hospital;
  hospitals?: Hospital[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, true, onClose);
  // Quem fez cada passo; sem a auditoria (falhou ou chamado antigo), ficam os horários do chamado
  const { data: events, loading } = useLoad(signal => getCallEvents(call.id, signal), call.id);
  const steps = callTimeline(call, events ?? [], hospitals);
  const { response, total } = callDurations(call);
  const gender = formatGender(call.patientInfo.gender);
  const patient = [call.patientInfo.age ? `${call.patientInfo.age} anos` : null, gender].filter(Boolean).join(', ');

  return createPortal(
    <div className={styles.backdrop} onClick={event => event.target === event.currentTarget && onClose()}>
      <aside ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="detalhe-chamado">
        <header className={styles.header}>
          <div>
            <h3 id="detalhe-chamado">Chamado de {openedAt(call.timestamp)}</h3>
            <span className={styles.id}>{call.id}</span>
          </div>
          <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.badges}>
            <PriorityLabel priority={call.priority} />
            <span className={styles.chip}>{resultLabel(call)}</span>
            {call.demo && <span className={styles.demo}>Demonstração</span>}
          </div>

          <dl className={styles.facts}>
            <dt>Endereço</dt>
            <dd>{call.address}</dd>
            {call.reference && (
              <>
                <dt>Referência</dt>
                <dd>{call.reference}</dd>
              </>
            )}
            {call.callerPhone && (
              <>
                <dt>Telefone</dt>
                <dd>{formatPhone(call.callerPhone)}</dd>
              </>
            )}
            <dt>O que aconteceu</dt>
            <dd>{call.description}</dd>
            {call.initialPriority && call.initialPriority !== call.priority && (
              <>
                <dt>Cor no registro</dt>
                <dd>{PRIORITY_META[call.initialPriority].name} (mudada na regulação)</dd>
              </>
            )}
            {call.closeNote && (
              <>
                <dt>{call.status === CallStatus.ORIENTADO ? 'Orientação' : 'Observação'}</dt>
                <dd>{call.closeNote}</dd>
              </>
            )}
            {call.triage?.signals.length ? (
              <>
                <dt>Sinais</dt>
                <dd>{signalsText(call.triage.signals)}</dd>
              </>
            ) : null}
            {patient && (
              <>
                <dt>Paciente</dt>
                <dd>{patient}</dd>
              </>
            )}
            <dt>Viatura</dt>
            <dd>{call.ambulance_id ? ambulanceCode : call.status === CallStatus.ORIENTADO ? 'Sem viatura (orientação por telefone)' : 'Não despachada'}</dd>
            {hospital && (
              <>
                <dt>Hospital</dt>
                <dd>{hospital.name}</dd>
              </>
            )}
          </dl>

          <h4 className={styles.subtitle}>Linha do tempo</h4>
          <ol className={styles.timeline} aria-busy={loading}>
            {steps.map(step => (
              <li key={step.key}>
                <span className={styles.time}>{formatClock(step.time)}</span>
                <span className={styles.step}>
                  {step.label}
                  {step.detail && <span className={styles.stepDetail}>{step.detail}</span>}
                  {step.who && <span className={styles.stepWho}>{step.who}</span>}
                </span>
                {step.since !== null && <small>+{formatMinutes(step.since)}</small>}
              </li>
            ))}
          </ol>

          <div className={styles.durations}>
            <div>
              <span>Tempo-resposta</span>
              <strong>{formatMinutes(response)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatMinutes(total)}</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}
