// Folha do hospital de destino (antes HospitalSheet.module.css): a mesma do relato de ocorrência
export const styles = {
  backdrop: 'fixed inset-0 z-1700 flex items-end bg-[rgba(0,0,0,0.35)]',
  // Sobe da barra com um deslize curto; com "reduzir movimento", aparece direto
  sheet: [
    'flex max-h-[85vh] w-full flex-col [border-radius:20px_20px_0_0] bg-surface px-4 pt-[18px] pb-[calc(env(safe-area-inset-bottom)+16px)] text-text [box-shadow:0_-6px_20px_rgba(0,0,0,0.25)]',
    '[animation:sheet-in_var(--dur-base)_var(--ease-out)] motion-reduce:[animation:none]',
    '[&_h2]:text-[20px] [&_h2]:font-display'
  ].join(' '),
  hint: 'mx-0 mt-0.5 mb-3 text-[14px] text-text-muted',
  list: 'm-0 flex list-none flex-col gap-2 overflow-y-auto p-0',
  // Botões grandes: dá para acertar com a viatura parada no local, com pressa. O atual leva aria-pressed
  option: [
    'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-left [font:inherit] text-text disabled:opacity-60',
    'aria-pressed:border-primary aria-pressed:bg-tint-neutral'
  ].join(' '),
  badge: 'grid size-[30px] shrink-0 place-items-center rounded-md bg-primary font-bold text-on-primary',
  text: 'flex min-w-0 flex-col [&_strong]:text-[16px] [&_small]:text-[13px] [&_small]:text-text-muted',
  cancel: 'mt-2.5 min-h-[52px] w-full cursor-pointer rounded-xl border border-border bg-surface text-[16px] font-[700] text-text'
};
