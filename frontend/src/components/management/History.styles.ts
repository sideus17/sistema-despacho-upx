// Histórico da Gestão (antes History.module.css). Fonte herdada por extenso: o [font:inherit] sai depois
// das classes de tamanho no CSS gerado e venceria o text-[Npx]
const inheritFont = '[font-family:inherit] [font-style:inherit] [font-variant:inherit] [font-stretch:inherit] [line-height:inherit]';

export const styles = {
  history: 'flex flex-col gap-3',
  // Busca e filtros numa linha (quebra em tela estreita)
  filters: 'flex flex-wrap items-center gap-2',
  search: [
    'flex min-h-10 flex-[1_1_280px] items-center gap-2 rounded-[10px] border border-border-strong bg-surface px-3 py-0 text-text-muted',
    // O anel fica na caixa toda (lupa + campo), com o mesmo contraste do foco do resto
    'focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
    `[&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-none [&_input]:bg-transparent [&_input]:text-text [&_input]:[font-family:inherit] [&_input]:[font-style:inherit] [&_input]:[font-variant:inherit] [&_input]:[font-stretch:inherit] [&_input]:[font-weight:inherit] [&_input]:[line-height:inherit] [&_input]:text-[14px]`,
    '[&_input:focus-visible]:[outline:none]'
  ].join(' '),
  // Vai no <Select>: o ! vence o min-w-0 do próprio Select
  filter: 'max-w-full min-w-[150px]! [@media(max-width:760px)]:flex-[1_1_140px]',
  clear:
    'min-h-10 cursor-pointer rounded-[10px] border-none bg-transparent px-3 py-0 text-[13px] font-[700] text-primary-text underline underline-offset-2',
  summary: 'flex items-center justify-between gap-3 text-[13px] text-text-muted',
  pager: [
    'flex items-center gap-1.5 [font-variant-numeric:tabular-nums]',
    '[&_button]:grid [&_button]:size-9 [&_button]:cursor-pointer [&_button]:place-items-center [&_button]:rounded-[50%] [&_button]:border [&_button]:border-border-strong [&_button]:bg-surface [&_button]:text-[20px] [&_button]:text-text',
    '[&_button_.icon]:align-[0] [&_button:disabled]:cursor-default [&_button:disabled]:opacity-40'
  ].join(' '),
  failure: [
    'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[10px] border border-tint-error-border bg-tint-error-strong px-3.5 py-2.5 text-[14px] text-tint-error-text',
    '[&_button]:min-h-9 [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-current [&_button]:bg-surface [&_button]:px-3.5 [&_button]:py-0 [&_button]:font-[700] [&_button]:[color:inherit]'
  ].join(' '),
  results: '[transition:opacity_var(--dur-fast)_var(--ease-out)]',
  refreshing: 'opacity-55',
  empty: 'px-4 py-10 text-center text-text-muted',

  // Tabela (computador)
  tableWrap: 'overflow-x-auto rounded-[14px] border border-border bg-surface',
  table: [
    'w-full border-collapse text-[13px]',
    '[&_:is(th,td)]:px-3 [&_:is(th,td)]:py-2.5 [&_:is(th,td)]:text-left [&_:is(th,td)]:align-top [&_:is(th,td)]:[border-bottom:1px_solid_var(--color-border)]',
    '[&_th]:font-[600] [&_th]:whitespace-nowrap [&_th]:text-text-muted',
    '[&_tbody_tr]:cursor-pointer [&_tbody_tr:last-child_td]:[border-bottom:none]',
    // Mais específico que a linha escolhida: o hover passa por cima dela, como antes
    '[@media(hover:hover)]:[&_tbody_tr:hover]:bg-surface-hover'
  ].join(' '),
  selectedRow: 'bg-tint-neutral outline-2 -outline-offset-2 outline-primary',
  number: 'text-right! whitespace-nowrap [font-variant-numeric:tabular-nums]',
  nowrap: 'whitespace-nowrap',
  addressCell: 'min-w-[220px]',
  rowButton: `cursor-pointer border-none bg-transparent p-0 text-left text-text ${inheritFont} [font-size:inherit] font-[700] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`,
  rowDescription: 'mt-0.5 block text-text-muted',
  priority: 'inline-flex items-center gap-1.5 whitespace-nowrap',
  dot: 'size-2.5 rounded-[50%]',
  demo: 'inline-block rounded-[999px] bg-tint-neutral px-2 py-0 text-[12px] leading-[1.6] font-[700] text-tint-neutral-text',

  // Cards (celular)
  cards: 'flex list-none flex-col gap-2',
  card: `flex w-full cursor-pointer flex-col gap-1 rounded-[14px] border border-border bg-surface px-3.5 py-3 text-left text-text ${inheritFont} [font-weight:inherit] text-[13px] [&_strong]:text-[14px]`,
  cardTop: 'flex items-center gap-2.5 text-text-muted',
  cardDescription: 'text-text-soft',
  cardMeta: 'text-[12px] text-text-muted'
};
