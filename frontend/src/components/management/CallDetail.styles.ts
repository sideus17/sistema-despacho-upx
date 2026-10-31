// Detalhe do chamado na Gestão (antes CallDetail.module.css): painel à direita; no celular, folha de baixo para cima
const pill = 'rounded-[999px] px-2.5 py-0.5 leading-[1.5] font-[700]';

export const styles = {
  // Acima do mapa e do cabeçalho; abaixo da conta (1800) e dos avisos (2000)
  backdrop: 'fixed inset-0 z-1200 flex justify-end bg-[rgba(0,0,0,0.35)] [@media(max-width:640px)]:items-end',
  panel: [
    'flex h-full w-[min(420px,100%)] flex-col bg-surface text-text [box-shadow:-8px_0_24px_rgba(0,0,0,0.25)]',
    '[@media(max-width:640px)]:h-auto [@media(max-width:640px)]:max-h-[88dvh] [@media(max-width:640px)]:w-full [@media(max-width:640px)]:rounded-[18px_18px_0_0] [@media(max-width:640px)]:[box-shadow:0_-8px_24px_rgba(0,0,0,0.25)]'
  ].join(' '),
  header: 'flex items-start justify-between gap-2 border-b border-b-border pt-3.5 pr-3 pb-3 pl-[18px] [&_h3]:text-[17px] [&_h3]:font-[700]',
  close:
    'grid size-10 shrink-0 cursor-pointer place-items-center rounded-[50%] border-none bg-transparent text-[22px] text-text-muted hover:bg-surface-hover [&_.icon]:align-[0]',
  body: 'flex flex-col gap-4 overflow-y-auto px-[18px] pt-4 pb-6 text-[14px]',
  badges: 'flex flex-wrap items-center gap-1.5 text-[13px]',
  chip: `${pill} bg-surface-hover text-text-soft`,
  demo: `${pill} bg-tint-neutral text-tint-neutral-text`,
  facts: 'grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 [&_dt]:font-[600] [&_dt]:text-text-muted',
  subtitle: 'text-[14px] font-[700]',
  timeline: [
    'flex list-none flex-col',
    '[&_li]:relative [&_li]:grid [&_li]:grid-cols-[52px_1fr_auto] [&_li]:items-baseline [&_li]:gap-2.5 [&_li]:py-1.5 [&_li]:pr-0 [&_li]:pl-[18px]',
    // Bolinha e linha ligando as etapas
    "[&_li::before]:absolute [&_li::before]:top-3 [&_li::before]:left-0.5 [&_li::before]:size-2 [&_li::before]:rounded-[50%] [&_li::before]:bg-primary [&_li::before]:content-['']",
    "[&_li:not(:last-child)::after]:absolute [&_li:not(:last-child)::after]:top-[22px] [&_li:not(:last-child)::after]:-bottom-2.5 [&_li:not(:last-child)::after]:left-[5px] [&_li:not(:last-child)::after]:w-0.5 [&_li:not(:last-child)::after]:bg-border-strong [&_li:not(:last-child)::after]:content-['']",
    '[&_small]:text-text-muted [&_small]:[font-variant-numeric:tabular-nums]'
  ].join(' '),
  time: 'font-[700] [font-variant-numeric:tabular-nums]',
  // Cada passo: o que foi, o que mudou e quem fez
  step: 'flex min-w-0 flex-col gap-px',
  stepDetail: 'text-[13px] text-text-soft',
  stepWho: 'text-[12px] text-text-muted',
  durations: [
    'grid grid-cols-[1fr_1fr] gap-2.5',
    '[&_div]:flex [&_div]:flex-col [&_div]:gap-0.5 [&_div]:rounded-[10px] [&_div]:bg-surface-muted [&_div]:px-3 [&_div]:py-2.5',
    '[&_span]:text-[12px] [&_span]:font-[600] [&_span]:text-text-muted [&_strong]:text-[18px]'
  ].join(' ')
};
