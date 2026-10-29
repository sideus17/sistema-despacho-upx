import { useEffect, useRef } from 'react';
import { Incident, IncidentType } from '../../types';
import { sourceLabel } from '../../map/incidents';
import { IncidentIcon } from '../../ui/IncidentIcon';
import { CheckIcon, CloseIcon } from '../../ui/icons';
import styles from './StillTherePrompt.module.css';

export const PROMPT_TIMEOUT_MS = 10000;

const QUESTION: Partial<Record<IncidentType, string>> = {
  [IncidentType.ALAGAMENTO]: 'Ainda está alagado aqui?',
  [IncidentType.VIA_BLOQUEADA]: 'A via ainda está bloqueada?',
  [IncidentType.QUEDA_ARVORE]: 'A árvore ainda está na via?',
  [IncidentType.ACIDENTE]: 'O acidente ainda está aqui?',
  [IncidentType.OBRAS]: 'As obras ainda estão aqui?',
  [IncidentType.CONGESTIONAMENTO]: 'Ainda está congestionado aqui?'
};

export const stillThereQuestion = (incident: Incident) => QUESTION[incident.type] ?? 'Ainda está lá?';

interface StillTherePromptProps {
  incident: Incident;
  onAnswer: (answer: 'SIM' | 'NAO' | null) => void; // null: sem resposta
}

// "Ainda está lá?" ao passar por uma ocorrência marcada por outra pessoa; some sozinho
export default function StillTherePrompt({ incident, onAnswer }: StillTherePromptProps) {
  // A navegação re-renderiza a cada leitura do GPS: o prazo não pode recomeçar a cada vez
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;

  useEffect(() => {
    const timer = window.setTimeout(() => answerRef.current(null), PROMPT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [incident.id]);

  return (
    <section className={styles.prompt} role="alertdialog" aria-label={stillThereQuestion(incident)}>
      <div className={styles.header}>
        <span className={styles.icon}><IncidentIcon type={incident.type} /></span>
        <div>
          <p className={styles.question}>{stillThereQuestion(incident)}</p>
          <p className={styles.source}>Marcado por: {sourceLabel(incident)}</p>
        </div>
      </div>
      <div className={styles.answers}>
        {/* As duas na mesma cor: de relance, verde e vermelho seriam lidos como "sim" e "não" ao contrário */}
        <button className={styles.answer} onClick={() => onAnswer('SIM')}><CheckIcon /> Ainda está</button>
        <button className={styles.answer} onClick={() => onAnswer('NAO')}><CloseIcon /> Já saiu</button>
      </div>
      <span key={incident.id} className={styles.timer} style={{ animationDuration: `${PROMPT_TIMEOUT_MS}ms` }} />
    </section>
  );
}
