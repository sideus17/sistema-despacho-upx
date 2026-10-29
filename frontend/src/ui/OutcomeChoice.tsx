import { useState } from 'react';
import { CallOutcome } from '../types';
import { OUTCOME_LABEL } from '../utils/calls';
import styles from './OutcomeChoice.module.css';

// Óbito fica separado e pede confirmação: é o desfecho que não pode sair de um toque errado
const COMMON_OUTCOMES = (Object.keys(OUTCOME_LABEL) as CallOutcome[]).filter(outcome => outcome !== CallOutcome.OBITO);

interface OutcomeChoiceProps {
  busy: boolean;
  onChoose: (outcome: CallOutcome) => void;
  onCancel: () => void;
  large?: boolean; // botões grandes no app da equipe
}

/** "Como terminou?": escolher o desfecho já finaliza (a escolha é a confirmação); óbito confirma antes. */
export function OutcomeChoice({ busy, onChoose, onCancel, large = false }: OutcomeChoiceProps) {
  const [confirmingDeath, setConfirmingDeath] = useState(false);

  if (confirmingDeath) {
    return (
      <div className={`${styles.choice} ${large ? styles.large : ''}`} role="group" aria-label="Confirmar óbito">
        <p className={styles.title}>{busy ? 'Finalizando…' : 'Confirmar o óbito do paciente?'}</p>
        <div className={styles.options}>
          <button type="button" className={styles.option} disabled={busy} onClick={() => onChoose(CallOutcome.OBITO)}>
            Confirmar óbito
          </button>
          <button type="button" className={styles.cancel} disabled={busy} onClick={() => setConfirmingDeath(false)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.choice} ${large ? styles.large : ''}`} role="group" aria-label="Como terminou o atendimento?">
      <p className={styles.title}>{busy ? 'Finalizando…' : 'Como terminou o atendimento?'}</p>
      <div className={styles.options}>
        {COMMON_OUTCOMES.map(outcome => (
          <button key={outcome} type="button" className={styles.option} disabled={busy} onClick={() => onChoose(outcome)}>
            {OUTCOME_LABEL[outcome]}
          </button>
        ))}
        <button type="button" className={`${styles.option} ${styles.separate}`} disabled={busy} onClick={() => setConfirmingDeath(true)}>
          {OUTCOME_LABEL[CallOutcome.OBITO]}
        </button>
        <button type="button" className={styles.cancel} disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
