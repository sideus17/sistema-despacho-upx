// Página da Gestão (antes ManagementPage.module.css): ocupa o lugar do mapa e da lateral, abaixo do cabeçalho
export const styles = {
  page: 'flex min-h-0 flex-1 flex-col bg-background',
  toolbar: 'shrink-0 border-b border-b-border bg-surface',
  toolbarInner:
    'mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2.5 px-4 pt-3 pb-0 [@media(max-width:640px)]:px-3 [@media(max-width:640px)]:pt-2.5',
  // Título da página bem acima dos títulos dos blocos (15 px): a escala da Gestão não fica plana
  title:
    'mr-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1 [&_h2]:text-[24px] [&_h2]:font-display [&_h2]:tracking-[-0.01em] [&_span]:text-[13px] [&_span]:text-text-muted',
  // Filtros numa linha só, valendo para tudo abaixo
  filters: 'flex flex-wrap items-center gap-x-3 gap-y-2',
  // Período: o escolhido leva aria-checked (o fundo é o SlidingThumb)
  segmented: [
    'slide-group inline-flex rounded-[999px] bg-surface-hover p-[3px]',
    '[&_button]:min-h-[34px] [&_button]:cursor-pointer [&_button]:rounded-[999px] [&_button]:border-none [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-0 [&_button]:text-[13px] [&_button]:font-[600] [&_button]:whitespace-nowrap [&_button]:text-text-soft',
    '[&_button[aria-checked=true]]:text-text [&_button[aria-checked=true]]:[transition:color_var(--dur-base)_var(--ease-out)]',
    '[@media(hover:hover)]:[&_button:hover]:text-text',
    '[@media(max-width:640px)]:[&_button]:px-2.5'
  ].join(' '),
  toggle:
    'inline-flex min-h-10 cursor-pointer items-center gap-2 text-[13px] font-[600] text-text-soft [&_input]:size-[18px] [&_input]:accent-primary',
  refresh:
    'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[999px] border border-border-strong bg-surface px-3 py-0 text-[13px] font-[600] text-text-soft hover:bg-surface-hover hover:text-text active:[transform:scale(0.94)]',
  refreshIcon: 'inline-flex',
  // Gira enquanto carrega; a volta em curso termina antes de parar
  spinning: 'animate-spinner',
  // Abas: linha rolável em tela estreita; a escolhida leva aria-selected
  tabs: [
    'slide-group flex basis-full gap-1 overflow-x-auto [scrollbar-width:none]',
    '[&_button]:inline-flex [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-1.5 [&_button]:bg-transparent [&_button]:px-3.5 [&_button]:py-0 [&_button]:text-[14px] [&_button]:font-[600] [&_button]:whitespace-nowrap [&_button]:text-text-muted',
    '[&_button]:[border-style:none_none_solid] [&_button]:[border-width:0_0_3px] [&_button]:border-b-transparent',
    // A linha de abas rola de lado e cortaria o anel por fora
    '[&_button:focus-visible]:outline-offset-[-2px]',
    '[&_button[aria-selected=true]]:font-bold [&_button[aria-selected=true]]:text-primary-text',
    // [role=tab] só pesa mais que o aria-selected: a escolhida também clareia no hover, como antes
    '[@media(hover:hover)]:[&_button[role=tab]:hover]:text-text'
  ].join(' '),
  content: 'min-h-0 flex-1 overflow-y-auto',
  // Mapa de calor: de ponta a ponta, sem rolagem (usado no lugar do content)
  contentMap: 'relative min-h-0 flex-1 overflow-hidden',
  contentInner: 'mx-auto max-w-[1440px] p-4 [@media(max-width:640px)]:p-3'
};
