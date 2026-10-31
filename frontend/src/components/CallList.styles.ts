// Classes da fila de chamados (antes CallList.module.css), escritas por extenso.
// Estados por atributo: aria-pressed (filtro e alertas), data-selected/data-fresh (cartão), data-stale, data-tall, data-late

// Regular, Despachar, Confirmar, Cancelar e afins
const button =
  'flex-1 min-h-touch cursor-pointer rounded-lg px-4 py-0 text-[14px] font-bold [transition:background-color_var(--dur-fast)_var(--ease-out)]';

export const styles = {
  container: 'p-4',

  // Filtros à esquerda, botão dos alertas à direita; sem espaço na mesma linha (lateral de 400 px), "Alertas" desce
  toolbar: 'mb-4 flex flex-wrap items-center gap-2',
  // Os filtros são o resumo das filas: quebram linha em vez de esconder algum fora da tela
  filters: 'flex min-w-0 max-w-full flex-auto flex-wrap gap-1.5',
  // O escolhido (aria-pressed) fica sem fundo: o fundo cheio vem do indicador que desliza (SlidingThumb)
  chip: [
    'group inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[999px] border border-border bg-surface px-2.5 py-1.5 text-[13px] font-medium text-text-muted',
    'not-aria-pressed:hover:bg-surface-hover not-aria-pressed:hover:text-text',
    'aria-pressed:border-transparent aria-pressed:bg-transparent aria-pressed:text-on-primary'
  ].join(' '),
  // O cinza do filtro desligado sobre o fundo do número dava 3,95:1: texto um tom mais forte
  chipCount:
    'min-w-5 rounded-[999px] bg-[rgba(128,128,128,0.18)] px-1.5 py-0 text-center text-[12px] text-text-soft group-aria-pressed:bg-[rgba(128,128,128,0.35)] group-aria-pressed:[color:inherit]',
  // Som e notificação de chamado novo e de espera longa (aria-pressed quando ligados)
  alerts: [
    'ml-auto inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-[999px] border border-border bg-surface px-2.5 py-1.5 text-[13px] font-medium text-text-muted',
    'hover:bg-surface-hover hover:text-text',
    'aria-pressed:border-primary aria-pressed:font-bold aria-pressed:text-text'
  ].join(' '),

  empty: 'py-6 text-center text-[15px] text-text-muted',
  // Resumo da espera longa no topo da fila
  late: 'mb-3 flex flex-col gap-1 rounded-lg border border-text-soft bg-surface px-3 py-2 text-[13px] leading-[1.4] font-bold text-text',

  // Filas em "Todos": regulação, despacho e em atendimento
  section: 'not-first-of-type:mt-5',
  sectionTitle:
    'mb-2 flex items-center gap-1.5 text-[12px] font-bold tracking-[0.03em] text-text-soft uppercase [&_span]:rounded-[999px] [&_span]:bg-surface-hover [&_span]:px-[7px] [&_span]:py-0 [&_span]:text-[12px] [&_span]:text-text-soft',
  list: 'flex flex-col gap-3',

  // Escolhido (data-selected): fundo neutro, a sombra do hover, a pulseira mais larga e um pulso curto de foco.
  // Recém-chegado (data-fresh): o fundo começa realçado e volta ao normal em 2 s, sem movimento
  card: [
    'cursor-pointer rounded-app border border-border border-l-(length:--pulseira-width) border-l-(color:--risk-edge) bg-surface px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
    '[transition:box-shadow_var(--dur-fast)_var(--ease-out),border-color_var(--dur-fast)_var(--ease-out),border-left-width_var(--dur-fast)_var(--ease-out),background-color_var(--dur-base)_var(--ease-out)]',
    'hover:shadow-[0_4px_10px_rgba(0,0,0,0.1)]',
    'data-selected:border-l-[length:calc(var(--pulseira-width)+2px)] data-selected:bg-tint-neutral data-selected:shadow-[0_4px_10px_rgba(0,0,0,0.1)]',
    'motion-safe:data-fresh:animate-[card-fresh_2s_var(--ease-out)] motion-safe:data-selected:not-data-fresh:animate-[card-focus_var(--dur-base)_var(--ease-out)]',
    'motion-reduce:data-fresh:bg-tint-neutral-strong motion-reduce:data-fresh:data-selected:bg-tint-neutral-strong'
  ].join(' '),
  // A etapa longa ("Transportando → Santa Casa · há 3 min") desce para a linha de baixo
  cardHeader: 'mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5',
  priority: 'text-[13px]',
  // Cor ainda não regulada
  suggestedTag:
    'ml-1.5 rounded-[999px] border border-dashed border-border-strong px-1.5 py-px align-middle text-[12px] font-medium text-text-muted',
  // Etapa do atendimento (GPS da viatura); com a linha do GPS parado (data-tall), vira um bloco de duas linhas
  stage:
    'max-w-full rounded-[999px] border border-tint-neutral-border bg-tint-neutral px-2 py-0.5 text-[12px] font-bold wrap-anywhere text-tint-neutral-text data-tall:rounded-[10px] data-tall:leading-[1.4]',
  gpsStale: 'block font-bold not-italic',
  srOnly: 'absolute h-px w-px overflow-hidden whitespace-nowrap [clip:rect(0_0_0_0)]',

  address: 'mb-1 text-[14px] leading-[1.4] font-medium',
  // Endereço: o botão do cartão para o teclado e o leitor de tela (o clique no cartão todo continua)
  cardButton: 'cursor-pointer rounded-[4px] border-none p-0 text-left [font:inherit] [background:none] [color:inherit]',
  // Confirmação da equipe no despacho; atrasada (data-late) em texto forte
  crewAck: 'mt-1 text-[13px] text-text-muted data-late:font-bold data-late:text-text',
  reference: 'mb-1 text-[13px] leading-[1.4] text-text-soft',
  description: 'text-[13px] leading-normal text-text-soft',
  // Sinais de alerta da triagem
  signals: 'text-[12px] leading-[1.4] font-medium text-text',
  patient: 'mt-2 flex gap-3 text-[12px] text-text-muted',

  progress: 'mt-2 flex cursor-default flex-col gap-1.5',
  timeline: 'text-[12px] leading-[1.4] text-text-muted tabular-nums',
  hospitalDone: 'text-[13px] text-text-soft',
  hospitalPick: 'flex flex-col gap-1 text-[12px] font-medium text-text-soft',
  // Troca de hospital pendente: só vale no "Salvar destino"
  hospitalSave: 'mt-1.5 flex gap-2',

  actions: 'mt-3 flex cursor-default flex-col gap-2',
  confirmRow: 'flex gap-2',
  primary: `${button} border-none bg-primary text-on-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60`,
  ghost: `${button} border border-border bg-transparent text-text-muted`,
  // GPS parado (data-stale): a etapa pode estar velha, o selo fica tracejado como no mapa
  ambulanceBadge:
    'self-start rounded-[6px] border border-tint-neutral-border bg-tint-neutral px-2.5 py-1 text-[12px] font-bold text-tint-neutral-text data-stale:border-dashed data-stale:border-text-soft',

  // Lista de atalhos no fim da fila; só para quem tem teclado
  shortcuts: 'mt-5 text-[12px] leading-normal text-text-muted [@media(hover:none)]:hidden'
};
