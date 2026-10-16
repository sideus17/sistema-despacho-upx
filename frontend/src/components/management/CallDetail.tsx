import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { CallStatus, CallTimes, EmergencyCall, Hospital } from '../../types';
import { CALL_STATUS_LABEL, OUTCOME_LABEL, formatClock, formatGender } from '../../utils/calls';
import { signalsText } from '../../utils/triage';
import { formatPhone } from '../../utils/documents';
import { PriorityLabel } from '../../ui/PriorityLabel';
import { useFocusTrap } from '../../ui/useFocusTrap';
import { CloseIcon } from '../../ui/icons';
import { formatMinutes } from './format';
import styles from './CallDetail.module.css';

// "12/10, 10:43"
export const openedAt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const seconds = (from?: string, to?: string) => (from && to ? Math.max(0, (Date.parse(to) - Date.parse(from)) / 1000) : null);

// Tempo-resposta (abertura → local) e total (abertura → fim); sem o horário, nulo
export function callDurations(call: EmergencyCall): { response: number | null; total: number | null } {
  return { response: seconds(call.timestamp, call.times?.onScene), total: seconds(call.timestamp, call.times?.finished) };
}

// Desfecho para quem finalizou; senão, o status
export function resultLabel(call: EmergencyCall): string {
  if (call.status === CallStatus.FINALIZADO) return call.outcome ? OUTCOME_LABEL[call.outcome] : 'Finalizado';
  return CALL_STATUS_LABEL[call.status] ?? call.status;
}

const STEPS: Array<[keyof CallTimes, string]> = [
  ['dispatched', 'Despacho'],
  ['enRoute', 'Saída da viatura'],
  ['onScene', 'Chegada ao local'],
  ['leftScene', 'Saída do local'],
  ['atHospital', 'Chegada ao hospital'],
  ['finished', 'Fim do atendimento']
];

// Linha do tempo: abertura e as etapas que aconteceram, com o tempo desde a abertura
export function callSteps(call: EmergencyCall): Array<{ label: string; time: string; since: number | null }> {
  return [
    { label: 'Abertura do chamado', time: call.timestamp, since: null },
    ...STEPS.flatMap(([key, label]) => {
      const time = call.times?.[key];
      return time ? [{ label, time, since: seconds(call.timestamp, time) }] : [];
    })
  ];
}

// Painel do chamado no histórico: à direita no computador, de baixo para cima no celular
export function CallDetail({ call, ambulanceCode, hospital, onClose }: {
  call: EmergencyCall;
  ambulanceCode: string;
  hospital?: Hospital;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, true, onClose);
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
            <dd>{call.ambulance_id ? ambulanceCode : 'Não despachada'}</dd>
            {hospital && (
              <>
                <dt>Hospital</dt>
                <dd>{hospital.name}</dd>
              </>
            )}
          </dl>

          <h4 className={styles.subtitle}>Linha do tempo</h4>
          <ol className={styles.timeline}>
            {callSteps(call).map(step => (
              <li key={step.label}>
                <span className={styles.time}>{formatClock(step.time)}</span>
                <span>{step.label}</span>
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
