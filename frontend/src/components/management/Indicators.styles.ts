// Indicadores da Gestão (também usados pelo Por pessoa). Recarregando: o quadro leva aria-busy e fica
// mais apagado, sem piscar
export const styles = {
  indicators: 'flex flex-col gap-4 [transition:opacity_var(--dur-fast)_var(--ease-out)] aria-busy:opacity-[0.55]',
  tiles: 'grid grid-cols-[repeat(4,minmax(0,1fr))] gap-3 [@media(max-width:1100px)]:grid-cols-[repeat(2,minmax(0,1fr))] [@media(max-width:480px)]:gap-2',
  grid: 'grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 [@media(max-width:900px)]:grid-cols-[minmax(0,1fr)]',
  // o <small> sozinho cai para 10,8 px
  muted: 'text-[12px] text-text-muted',
  priorityKey: 'inline-flex items-center gap-2 [&_small]:text-[12px] [&_small]:text-text-muted',
  dot: 'size-2.5 shrink-0 rounded-[50%]',
  stageLabel: 'flex flex-col [&_small]:text-[12px]',
  // Parte de cada cor no total; a ponta arredondada não disputa entre primeiro, último e único
  share: [
    'flex h-4 gap-0.5 [transform-origin:left] [animation:chart-share-grow_400ms_var(--ease-out)_both] motion-reduce:[animation:none]',
    '[&_span]:min-w-0.5 [&_span]:basis-0 [&_span]:[transition:flex-grow_250ms_var(--ease-out)] motion-reduce:[&_span]:[transition:none]',
    '[&_span:first-child:not(:only-child)]:rounded-[4px_0_0_4px] [&_span:last-child:not(:only-child)]:rounded-[0_4px_4px_0] [&_span:only-child]:rounded-[4px]'
  ].join(' '),
  shareLegend: 'flex list-none flex-col gap-2 text-[13px] [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-3',
  shareValue: 'flex items-baseline gap-2 [font-variant-numeric:tabular-nums]',
  notice:
    'flex flex-col gap-1 rounded-[10px] border border-tint-neutral-border bg-tint-neutral px-3.5 py-2.5 text-[13px] text-tint-neutral-text',
  empty: 'flex flex-col items-center gap-1.5 px-4 py-12 text-center text-text-muted [&_strong]:text-[16px] [&_strong]:text-text',
  failure: [
    'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[10px] border border-tint-error-border bg-tint-error-strong px-3.5 py-2.5 text-[14px] text-tint-error-text',
    '[&_button]:min-h-9 [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-current [&_button]:bg-surface [&_button]:px-3.5 [&_button]:py-0 [&_button]:font-[700] [&_button]:text-inherit'
  ].join(' ')
};
