// Folha "O que tem na via?" (antes ReportSheet.module.css)
export const styles = {
  // Fica sobre o app da equipe e sobre a navegação (que usa z-index 1500)
  backdrop: 'fixed inset-0 z-1700 flex items-end bg-[rgba(0,0,0,0.35)]',
  // A folha sobe da barra com um deslize curto; com "reduzir movimento", aparece direto
  sheet:
    'max-h-[calc(100dvh-16px)] w-full overflow-y-auto rounded-[20px_20px_0_0] bg-surface px-4 pt-[18px] pb-[calc(env(safe-area-inset-bottom)+16px)] text-text [box-shadow:0_-6px_20px_rgba(0,0,0,0.25)] [animation:sheet-in_var(--dur-base)_var(--ease-out)] motion-reduce:[animation:none] [&_h2]:text-[20px] [&_h2]:font-display',
  hint: 'mx-0 mt-0.5 mb-3.5 text-[14px] text-text-muted',
  grid: 'grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2',
  // Botões grandes: dá para acertar com a viatura em movimento
  option:
    'flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-solid border-border-strong bg-tint-neutral px-1 py-1.5 text-center text-[13px] leading-[1.15] font-bold [overflow-wrap:anywhere] text-text disabled:opacity-60',
  optionIcon: 'text-[30px] leading-[0]',
  cancel:
    'mt-2.5 min-h-[52px] w-full cursor-pointer rounded-xl border border-solid border-border bg-surface text-[16px] font-[700] text-text'
};
