import { CallOutcome } from '../types';
import { OUTCOME_LABEL } from '../utils/calls';
import styles from './OutcomeChoice.module.css';

interface OutcomeChoiceProps {
  busy: boolean;
  onChoose: (outcome: CallOutcome) => void;
  onCancel: () => void;
  large?: boolean; // botões grandes no app da equipe
}

/** "Como terminou?": escolher o desfecho já finaliza (a escolha é a confirmação). */
export function OutcomeChoice({ busy, onChoose, onCancel, large = false }: OutcomeChoiceProps) {
  return (
    <div className={`${styles.choice} ${large ? styles.large : ''}`} role="group" aria-label="Como terminou o atendimento?">
      <p className={styles.title}>{busy ? 'Finalizando…' : 'Como terminou o atendimento?'}</p>
      <div className={styles.options}>
        {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map(outcome => (
          <button key={outcome} type="button" className={styles.option} disabled={busy} onClick={() => onChoose(outcome)}>
            {OUTCOME_LABEL[outcome]}
          </button>
        ))}
        <button type="button" className={styles.cancel} disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
