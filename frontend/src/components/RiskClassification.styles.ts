// Classificação de risco: sinais por cor e a escolha da cor (registro e regulação).
// --risk, --risk-edge e --risk-on vêm de riskVars(), no style de cada grupo e cor

const chip = 'inline-block cursor-pointer rounded-[999px] border border-border-strong bg-surface px-2.5 py-1.5 text-left text-[13px] text-text';
const marked = 'border-(--risk-edge) bg-(--risk) font-bold text-(--risk-on)';

export const styles = {
  label: 'mb-1.5 block text-[13px] font-medium text-text-soft',
  hint: 'text-[12px] leading-[1.4] text-text-muted',
  warning:
    'rounded-lg border border-tint-neutral-border bg-tint-neutral px-2.5 py-2 text-[13px] font-medium text-tint-neutral-text',
  triage: 'flex flex-col gap-2.5 rounded-[10px] border border-border p-3 [&_legend]:mb-0 [&_legend]:px-1 [&_legend]:py-0',
  signalGroup: 'flex flex-col gap-1.5 border-l-[length:var(--pulseira-width)] border-l-(--risk-edge) pl-2.5',
  groupName: 'text-[12px] font-bold tracking-[0.03em] text-text-soft uppercase',
  chips: 'flex flex-wrap gap-1.5',
  // Sinal que dá para marcar (aria-pressed)
  chip: `${chip} aria-pressed:border-(--risk-edge) aria-pressed:bg-(--risk) aria-pressed:font-bold aria-pressed:text-(--risk-on) hover:not-aria-pressed:bg-surface-hover`,
  // Sinal só exibido, já marcado no registro; usado sozinho (já inclui o chip)
  chipMarked: `${chip} ${marked}`,
  suggestion: 'text-[13px] text-text-soft',
  colors: 'grid grid-cols-[repeat(4,1fr)] gap-1.5 [@media(max-width:380px)]:grid-cols-[repeat(2,1fr)]',
  color: [
    'flex min-h-touch cursor-pointer flex-col items-center gap-0.5 rounded-lg border-2 border-(--risk-edge) bg-surface px-1 py-1.5 text-[12px] text-text [&_strong]:text-[13px]',
    'aria-checked:bg-(--risk) aria-checked:text-(--risk-on) aria-checked:[box-shadow:0_0_0_2px_var(--color-surface),0_0_0_4px_var(--risk-edge)]'
  ].join(' ')
};
