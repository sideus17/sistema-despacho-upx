import { useState } from 'react';
import { CallOutcome } from '../types';
import { OUTCOME_LABEL } from '../utils/calls';

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
  // App da equipe: alvos grandes, na zona do polegar
  const size = large ? 'min-h-[52px] rounded-app text-[15px]' : 'min-h-touch rounded-lg text-[13px]';
  const button = `${size} cursor-pointer px-2.5 py-1.5 leading-[inherit] font-bold disabled:cursor-wait disabled:opacity-60`;
  // Desfechos em cor neutra: nenhum deles é "sucesso"
  const option = `${button} border border-border-strong bg-surface text-text hover:bg-surface-hover`;
  const cancel = `${button} border border-border bg-transparent text-text-muted`;
  const title = `m-0 font-bold text-text ${large ? 'text-[15px]' : 'text-[13px]'}`;

  if (confirmingDeath) {
    return (
      <div className="flex w-full flex-col gap-2" role="group" aria-label="Confirmar óbito">
        <p className={title}>{busy ? 'Finalizando…' : 'Confirmar o óbito do paciente?'}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className={option} disabled={busy} onClick={() => onChoose(CallOutcome.OBITO)}>
            Confirmar óbito
          </button>
          <button type="button" className={cancel} disabled={busy} onClick={() => setConfirmingDeath(false)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2" role="group" aria-label="Como terminou o atendimento?">
      <p className={title}>{busy ? 'Finalizando…' : 'Como terminou o atendimento?'}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {COMMON_OUTCOMES.map(outcome => (
          <button key={outcome} type="button" className={option} disabled={busy} onClick={() => onChoose(outcome)}>
            {OUTCOME_LABEL[outcome]}
          </button>
        ))}
        {/* Óbito afastado dos outros */}
        <button type="button" className={`${option} mt-2`} disabled={busy} onClick={() => setConfirmingDeath(true)}>
          {OUTCOME_LABEL[CallOutcome.OBITO]}
        </button>
        <button type="button" className={cancel} disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
