// Classes da análise de despacho (antes DispatchAnalysis.module.css)

const button = 'min-h-touch w-full cursor-pointer rounded-lg px-4 py-0 text-[14px] font-bold';

export const styles = {
  container: 'p-4',
  notice:
    'rounded-[10px] border border-tint-neutral-border bg-tint-neutral px-3.5 py-3 text-[14px] leading-normal text-tint-neutral-text',
  back: 'mb-3 min-h-9 cursor-pointer border-none bg-transparent p-0 text-[14px] font-medium text-primary-text',

  // Contexto do chamado
  callContext:
    'mb-4 rounded-app border border-border border-l-[length:var(--pulseira-width)] border-l-(--risk-edge) bg-surface px-4 py-3.5',
  callContextHeader: 'mb-1.5 flex flex-wrap items-center justify-between gap-2',
  priority: 'text-[13px]',
  address: 'mb-1 text-[15px] leading-[1.4] font-bold',
  reference: 'mb-1 text-[13px] leading-[1.4] text-text-soft',
  description: 'text-[13px] leading-normal text-text-soft',

  // Carregamento
  loading: 'p-6 text-center text-text-muted',
  spinner: 'mb-3',
  retry: 'min-h-touch w-full cursor-pointer rounded-lg border-none bg-primary text-[14px] font-bold text-on-primary',

  // Opções
  options: 'flex flex-col gap-4',
  // Recomendada (data-best): contorno de 2 px e o selo; escolhida (data-selected): fundo e anel em tinta
  option: [
    'relative cursor-pointer rounded-app border border-border bg-surface p-4 [box-shadow:0_1px_3px_rgba(0,0,0,0.08)]',
    '[transition:box-shadow_var(--dur-fast)_var(--ease-out),border-color_var(--dur-fast)_var(--ease-out)]',
    'data-best:border-2 data-best:not-data-selected:border-text-soft',
    'data-selected:border-primary data-selected:bg-tint-neutral data-selected:[box-shadow:0_0_0_2px_var(--color-primary)]',
    'not-data-selected:hover:[box-shadow:0_4px_10px_rgba(0,0,0,0.12)]'
  ].join(' '),
  bestBadge: 'absolute -top-[11px] right-4 rounded-[999px] bg-primary px-3 py-[3px] text-[12px] font-bold text-on-primary',
  optionHeader: 'mb-3 flex items-center justify-between',
  // Foco de programa ao abrir o passo, não de teclado
  title: 'mx-0 mt-0 mb-3 text-[20px] font-bold text-text focus:[outline:none]',
  ambulance: 'flex cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 text-left [color:inherit] [font:inherit]',
  ambulanceText: 'flex flex-col',
  code: 'text-[16px] font-bold',
  meta: 'text-[12px] text-text-muted',
  typeIcon:
    'grid size-10 shrink-0 place-items-center rounded-[10px] bg-tint-neutral text-[20px] text-primary-text [&_.icon]:align-[0]',
  driver: 'mt-1 flex items-center gap-1.5 font-medium text-text',
  route:
    'mb-3 flex flex-wrap gap-x-3.5 gap-y-1.5 rounded-lg border border-tint-neutral-border bg-tint-neutral p-2.5 text-[13px] text-tint-neutral-text',
  routeNotes: 'not-empty:mx-0 not-empty:-mt-1 not-empty:mb-3',
  staleNote: 'mx-0 mt-0 mb-1.5 text-[13px] font-bold text-text',
  routePending: 'mb-3 rounded-lg border border-dashed border-border p-2.5 text-center text-[12px] text-text-muted',
  explanation:
    'rounded-lg border border-tint-neutral-border bg-tint-neutral p-2.5 text-[13px] leading-normal text-tint-neutral-text',

  // Sem viatura livre: o próximo passo é voltar à fila
  noFree:
    'flex flex-col gap-1.5 rounded-app border border-tint-neutral-border bg-tint-neutral px-4 py-3.5 text-[14px] leading-normal text-tint-neutral-text [&>button]:mt-1.5',
  noFreeTitle: 'text-[16px] font-bold',

  // Ocupadas: só informação, sem botão
  busy: 'mt-5',
  busyTitle: 'mx-0 mt-0 mb-2 text-[12px] font-bold tracking-[0.03em] text-text-soft uppercase',
  busyList: 'flex list-none flex-col gap-1.5',
  busyItem:
    'flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-[13px] text-text-soft [&_strong]:text-text',

  // Ações
  actions: 'mt-3 cursor-default',
  // O primeiro botão (Confirmar) ocupa o dobro do Cancelar
  confirmRow: 'flex gap-2 [&>:first-child]:flex-[2]',
  execute: `${button} border-none bg-primary text-on-primary not-disabled:hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-text-muted`,
  cancel: `${button} flex-1 border border-border bg-surface text-text-muted`
};
