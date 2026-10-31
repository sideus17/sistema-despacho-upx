import { KeyboardEvent, ReactNode, useRef } from 'react';
import { CallPriority } from '../types';
import { PRIORITIES_BY_SEVERITY, PRIORITY_META, riskVars } from '../utils/calls';
import { TRIAGE_SIGNALS } from '../utils/triage';
import { styles } from './RiskClassification.styles';

interface RiskClassificationProps {
  signals: string[];
  // Sem ela, os sinais só aparecem (a regulação vê o que foi marcado no registro)
  onToggleSignal?: (code: string) => void;
  value: CallPriority | null;
  onChange: (priority: CallPriority) => void;
  suggested: CallPriority | null;
  legend?: string;
  footnote?: ReactNode;
  // As teclas 1 a 4 escolhem a cor (quem trata as teclas é a tela; aqui ficam o aviso e o aria-keyshortcuts)
  numberKeys?: boolean;
}

// Sinais agrupados pela cor que sugerem (o azul não tem sinal: é escolha de quem classifica)
const SIGNAL_GROUPS = PRIORITIES_BY_SEVERITY
  .map(priority => ({ priority, signals: TRIAGE_SIGNALS.filter(signal => signal.priority === priority) }))
  .filter(group => group.signals.length > 0);

// Classificação de risco em 4 cores: sinais de alerta, a cor que eles sugerem e a escolhida
export default function RiskClassification({
  signals,
  onToggleSignal,
  value,
  onChange,
  suggested,
  legend = 'Classificação de risco',
  footnote,
  numberKeys = false
}: RiskClassificationProps) {
  const editable = !!onToggleSignal;
  // Grupo de rádio: só a cor escolhida (ou a primeira) entra no Tab; as setas trocam a escolha
  const colorRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabbable = Math.max(0, value ? PRIORITIES_BY_SEVERITY.indexOf(value) : 0);
  const moveColor = (event: KeyboardEvent, index: number) => {
    const count = PRIORITIES_BY_SEVERITY.length;
    const steps: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: count - 1 };
    if (!(event.key in steps)) return;
    event.preventDefault();
    const next = (steps[event.key] + count) % count;
    onChange(PRIORITIES_BY_SEVERITY[next]);
    colorRefs.current[next]?.focus();
  };
  const groups = editable
    ? SIGNAL_GROUPS
    : SIGNAL_GROUPS.map(group => ({ ...group, signals: group.signals.filter(signal => signals.includes(signal.code)) })).filter(
        group => group.signals.length > 0
      );
  // Na regulação (só leitura), a cor sugerida só aparece junto dos sinais que a sustentam
  const showSuggestion = editable || groups.length > 0;
  const shownSuggestion = showSuggestion ? suggested : null;
  const milder = !!(value && shownSuggestion && PRIORITY_META[value].order > PRIORITY_META[shownSuggestion].order);

  return (
    <fieldset className={styles.triage}>
      <legend className={styles.label}>{legend}</legend>
      {editable ? (
        <p className={styles.hint}>Marque os sinais de alerta que quem ligou relatar.</p>
      ) : groups.length === 0 ? (
        <p className={styles.hint}>Nenhum sinal de alerta marcado no registro.</p>
      ) : (
        <p className={styles.hint}>Sinais de alerta marcados no registro:</p>
      )}

      {groups.map(group => (
        <div key={group.priority} className={styles.signalGroup} style={riskVars(group.priority)}>
          <span className={styles.groupName}>{PRIORITY_META[group.priority].name}</span>
          <div className={styles.chips}>
            {group.signals.map(signal =>
              editable ? (
                <button
                  key={signal.code}
                  type="button"
                  className={styles.chip}
                  aria-pressed={signals.includes(signal.code)}
                  onClick={() => onToggleSignal(signal.code)}
                >
                  {signal.label}
                </button>
              ) : (
                <span key={signal.code} className={styles.chipMarked}>{signal.label}</span>
              )
            )}
          </div>
        </div>
      ))}

      {showSuggestion && (
        <p className={styles.suggestion} role="status">
          {shownSuggestion ? <>Sugerida pelos sinais: <strong>{PRIORITY_META[shownSuggestion].name}</strong></> : 'Sem sinais marcados: escolha a cor.'}
        </p>
      )}

      <div className={styles.colors} role="radiogroup" aria-label={legend}>
        {PRIORITIES_BY_SEVERITY.map((option, index) => {
          const meta = PRIORITY_META[option];
          return (
            <button
              key={option}
              ref={element => { colorRefs.current[index] = element; }}
              type="button"
              role="radio"
              aria-checked={value === option}
              tabIndex={index === tabbable ? 0 : -1}
              aria-keyshortcuts={numberKeys ? String(index + 1) : undefined}
              onKeyDown={event => moveColor(event, index)}
              className={styles.color}
              style={riskVars(option)}
              onClick={() => onChange(option)}
            >
              <strong>{meta.name}</strong>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {numberKeys && <small className={styles.hint}>Teclas 1 a 4 escolhem a cor.</small>}
      {milder && <p className={styles.warning}>A cor escolhida é menos grave que a sugerida pelos sinais.</p>}
      {footnote && <small className={styles.hint}>{footnote}</small>}
    </fieldset>
  );
}
