// Classes dos gráficos da gestão (antes charts.module.css), escritas por extenso. As animações
// (chart-grow-x, chart-grow-y, chart-fade, chart-draw) estão no index.css; o atraso vai no próprio
// shorthand, porque duas propriedades arbitrárias não têm ordem garantida.
// Sem movimento: os gráficos aparecem prontos e trocam de valor na hora (motion-reduce)
const still = 'motion-reduce:[animation:none] motion-reduce:[transition:none]';
const numbers = '[font-variant-numeric:tabular-nums]';

export const styles = {
  // Cartão de gráfico
  card: 'flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-border bg-surface p-4',
  wide: 'col-span-full',
  cardHeader:
    'flex items-start justify-between gap-3 [&_h3]:text-[15px] [&_h3]:font-[700] [&_p]:mt-0.5 [&_p]:text-[13px] [&_p]:text-text-muted',
  // Marcado: o hover escurece o fundo cheio, sem clarear sob o texto branco
  tableToggle: [
    'min-h-8 shrink-0 cursor-pointer rounded-[999px] border border-border-strong bg-surface px-3 py-0 text-[13px] font-[600] text-text-soft',
    'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary',
    'hover:not-aria-pressed:bg-surface-hover aria-pressed:hover:border-primary-hover aria-pressed:hover:bg-primary-hover'
  ].join(' '),
  tableWrap: 'max-h-[320px] overflow-auto',
  table: [
    `w-full border-collapse text-[13px] ${numbers}`,
    '[&_:is(th,td)]:border-b [&_:is(th,td)]:border-b-border [&_:is(th,td)]:px-2 [&_:is(th,td)]:py-1.5 [&_:is(th,td)]:text-left',
    '[&_th]:sticky [&_th]:top-0 [&_th]:bg-surface [&_th]:font-[600] [&_th]:text-text-muted'
  ].join(' '),

  // Número em destaque
  tile: 'flex min-w-0 flex-col gap-1 rounded-[14px] border border-border bg-surface px-4 py-3.5',
  tileLabel: 'text-[13px] font-[600] text-text-muted',
  tileValue: 'text-[28px] leading-[1.15] font-[700]',
  tileDetail: 'text-[12px] text-text-muted',

  // Colunas (SVG)
  columns: 'relative w-full [&_svg]:block [&_svg]:overflow-visible',
  grid: '[stroke:var(--color-border)] [stroke-width:1] [shape-rendering:crispEdges]',
  axis: `[fill:var(--color-text-muted)] text-[12px] ${numbers}`,
  peak: '[fill:var(--color-text)] text-[12px] font-[700]',
  column: `[fill:var(--chart-accent)] origin-bottom [transform-box:fill-box] [animation:chart-grow-y_400ms_var(--ease-out)_calc(var(--i,0)*40ms)_both] [transition:opacity_var(--dur-fast)_var(--ease-out),d_250ms_var(--ease-out)] ${still}`,
  hit: '[fill:transparent] cursor-default [outline:none] focus-visible:[stroke:var(--color-primary)] focus-visible:[stroke-width:2]',
  tooltip:
    'pointer-events-none absolute z-2 flex flex-col gap-px rounded-lg bg-surface-inverse px-2.5 py-1.5 text-[12px] whitespace-nowrap text-white [box-shadow:0_4px_12px_rgba(0,0,0,0.2)] [transform:translate(-50%,-100%)] [&_span]:opacity-80 [&_strong]:text-[13px]',

  // Barras horizontais
  bars: 'flex list-none flex-col gap-2.5',
  barRow:
    'grid grid-cols-[minmax(110px,38%)_1fr_auto] items-center gap-2.5 text-[13px] [@media(max-width:640px)]:grid-cols-[minmax(90px,40%)_1fr_auto]',
  barLabel: 'min-w-0 [overflow-wrap:anywhere]',
  barTrack: 'relative h-3',
  // data-muted: "sem registro", em cinza. data-clipped: passou do fim da escala, a ponta fica aberta (tracejada)
  bar: [
    'absolute [inset:0_auto_0_0] min-w-0.5 origin-left rounded-[0_4px_4px_0] bg-chart-accent',
    `[animation:chart-grow-x_400ms_var(--ease-out)_calc(var(--i,0)*40ms)_both] [transition:width_250ms_var(--ease-out)] ${still}`,
    'data-muted:bg-border-strong',
    'data-clipped:rounded-none data-clipped:[mask-image:linear-gradient(to_right,#000_calc(100%_-_10px),transparent_calc(100%_-_10px),transparent_calc(100%_-_7px),#000_calc(100%_-_7px),#000_calc(100%_-_4px),transparent_calc(100%_-_4px))]'
  ].join(' '),
  // Referência (ex.: mediana da equipe): traço tracejado em todas as linhas
  barReference: `absolute top-[-3px] bottom-[-3px] [border-left:2px_dashed_var(--color-text)] [transform:translateX(-1px)] [transition:left_250ms_var(--ease-out)] ${still}`,
  referenceNote: 'mt-2.5 flex items-center gap-1.5 text-[12px] text-text-muted',
  referenceKey: 'h-3 [border-left:2px_dashed_var(--color-text)]',
  barValue: `flex min-w-14 flex-col items-end ${numbers} [&_small]:text-[12px] [&_small]:text-text-muted`,

  // Mediana e percentil 90
  ranges: 'flex flex-col gap-3',
  rangeLegend:
    'flex list-none flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-text-muted [&_li]:inline-flex [&_li]:items-center [&_li]:gap-1.5',
  keyBar: 'h-2.5 w-4 rounded-[0_3px_3px_0] bg-text-muted',
  keyWhisker:
    "relative mr-1 h-0.5 w-[18px] bg-text-muted after:absolute after:top-[-3px] after:right-[-4px] after:size-2 after:rounded-[50%] after:bg-text-muted after:content-['']",
  keyTarget: 'h-3.5 w-0.5 bg-text',
  rangeRows: 'flex list-none flex-col gap-3',
  rangeRow: [
    'grid grid-cols-[minmax(130px,28%)_1fr_minmax(150px,30%)] items-center gap-3 text-[13px]',
    "[@media(max-width:640px)]:grid-cols-[1fr_auto] [@media(max-width:640px)]:gap-x-3 [@media(max-width:640px)]:gap-y-1 [@media(max-width:640px)]:[grid-template-areas:'label_summary'_'track_track']"
  ].join(' '),
  rangeLabel: 'min-w-0 [@media(max-width:640px)]:[grid-area:label]',
  rangeTrack: 'relative h-6 border-l border-l-border-strong [@media(max-width:640px)]:[grid-area:track]',
  rangeBar: `absolute top-1.5 left-0 h-3 min-w-0.5 origin-left rounded-[0_4px_4px_0] bg-current [animation:chart-grow-x_400ms_var(--ease-out)_calc(var(--i,0)*40ms)_both] [transition:width_250ms_var(--ease-out)] ${still}`,
  rangeWhisker: `absolute top-[11px] h-0.5 bg-current opacity-55 [animation:chart-fade_300ms_var(--ease-out)_calc(var(--i,0)*40ms_+_250ms)_both] [transition:left_250ms_var(--ease-out),width_250ms_var(--ease-out)] ${still}`,
  rangeDot: `absolute top-2 size-2 rounded-[50%] bg-current [box-shadow:0_0_0_2px_var(--color-surface)] [transform:translateX(-50%)] [animation:chart-fade_300ms_var(--ease-out)_calc(var(--i,0)*40ms_+_300ms)_both] [transition:left_250ms_var(--ease-out)] ${still}`,
  rangeTarget: 'absolute inset-y-0 w-0.5 bg-text [transform:translateX(-1px)]',
  rangeSummary: `flex flex-col gap-px ${numbers} [@media(max-width:640px)]:items-end [@media(max-width:640px)]:[grid-area:summary]`,
  rangeAxis: [
    'grid grid-cols-[minmax(130px,28%)_1fr_minmax(150px,30%)] items-center gap-3 text-[13px]',
    '[@media(max-width:640px)]:grid-cols-[1fr] [@media(max-width:640px)]:[&>span:first-child]:hidden [@media(max-width:640px)]:[&>span:last-child]:hidden'
  ].join(' '),
  rangeTicks: `relative h-3.5 text-[12px] text-text-muted ${numbers} [&_span]:absolute [&_span]:top-0 [&_span]:whitespace-nowrap [&_span]:[transform:translateX(-50%)] [&_span:first-child]:[transform:none] [&_span:last-child]:[transform:translateX(-100%)]`,

  // Gráfico de bala: faixas cinza ao fundo, barra fina na cor e a referência em tinta
  bulletTrack: 'relative h-6',
  bulletBand: 'absolute top-0.5 bottom-0.5 bg-surface-hover nth-2:bg-border nth-3:bg-border-strong nth-3:opacity-60',
  bulletBar: `absolute top-2 left-0 h-2 min-w-0.5 origin-left rounded-[0_3px_3px_0] bg-current [animation:chart-grow-x_400ms_var(--ease-out)_calc(var(--i,0)*40ms)_both] [transition:width_250ms_var(--ease-out)] ${still}`,

  // Gráfico de corrida: série em linha, mediana tracejada e as sequências fora do acaso em tinta (data-shift)
  medianLine: '[stroke:var(--color-text-muted)] [stroke-width:1.5] [stroke-dasharray:5_4]',
  medianLabel: '[fill:var(--color-text-muted)] text-[12px] font-[600]',
  runLine: `[fill:none] [stroke:var(--chart-accent)] [stroke-width:2] [stroke-linejoin:round] [stroke-dasharray:1] [animation:chart-draw_600ms_var(--ease-out)_both] ${still}`,
  runDot: `[fill:var(--color-surface)] [stroke:var(--chart-accent)] [stroke-width:2] [animation:chart-fade_300ms_var(--ease-out)_300ms_both] [transition:r_var(--dur-fast)_var(--ease-out)] ${still} data-shift:[fill:var(--color-text)] data-shift:[stroke:var(--color-text)]`,
  runNote: 'mt-2 flex items-center gap-1.5 text-[12px] text-text-muted',
  runNoteDot: 'size-2 shrink-0 rounded-[50%] bg-text'
};
