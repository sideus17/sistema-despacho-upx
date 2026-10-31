// Navegação da viatura (antes NavigationView.module.css). Celular deitado (até 540 px de altura): instrução e
// painel numa coluna à esquerda, mapa no resto da tela — as classes [@media(orientation:landscape)_and_(max-height:540px)]
// Estados: o painel recolhido leva data-nav-collapsed, a faixa recalculando leva data-warning e o velocímetro acima do limite, data-speeding

// Botões do painel (voz, Waze, Sair, Sair da navegação)
const panelButton =
  'flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl font-bold [@media(orientation:landscape)_and_(max-height:540px)]:min-h-11';
const notice = 'rounded-[10px] border bg-surface px-3.5 py-2.5 text-center text-text';

export const styles = {
  // A altura do painel de baixo é medida no componente; os botões flutuantes ficam logo acima
  screen: [
    'fixed inset-0 z-1500 bg-map-loading [--panel-h:calc(env(safe-area-inset-bottom)+150px)]',
    // Atribuição do mapa (obrigatória) acima do painel inferior; ! para vencer o CSS do MapLibre, fora de camada
    '[&_.maplibregl-ctrl-bottom-right]:bottom-(--panel-h)! [@media(orientation:landscape)_and_(max-height:540px)]:[&_.maplibregl-ctrl-bottom-right]:bottom-0!'
  ].join(' '),
  // ! porque o .maplibregl-map do MapLibre (fora de camada) põe position: relative no mesmo elemento
  map: 'absolute! inset-0',

  // Topo: instrução e avisos
  top: [
    'absolute top-[calc(env(safe-area-inset-top)+10px)] right-2.5 left-2.5 flex flex-col gap-2',
    '[@media(orientation:landscape)_and_(max-height:540px)]:top-[calc(env(safe-area-inset-top)+8px)] [@media(orientation:landscape)_and_(max-height:540px)]:right-auto [@media(orientation:landscape)_and_(max-height:540px)]:left-[calc(env(safe-area-inset-left)+10px)] [@media(orientation:landscape)_and_(max-height:540px)]:w-[min(380px,42%)] [@media(orientation:landscape)_and_(max-height:540px)]:gap-1.5'
  ].join(' '),
  // Faixa de instrução: escura nos dois temas, como nos apps de navegação
  banner: [
    'flex min-h-[72px] items-center gap-3.5 rounded-2xl bg-header px-4 py-3 text-white [box-shadow:0_6px_18px_rgba(0,0,0,0.25)] data-warning:bg-[#374151]',
    '[@media(orientation:landscape)_and_(max-height:540px)]:min-h-0 [@media(orientation:landscape)_and_(max-height:540px)]:gap-2.5 [@media(orientation:landscape)_and_(max-height:540px)]:px-3 [@media(orientation:landscape)_and_(max-height:540px)]:py-2'
  ].join(' '),
  icon: 'flex w-12 shrink-0 justify-center text-[40px] leading-none [@media(orientation:landscape)_and_(max-height:540px)]:w-9 [@media(orientation:landscape)_and_(max-height:540px)]:text-[30px]',
  // A distância muda a cada metro: os algarismos não dançam
  distance:
    'text-[26px] leading-[1.1] font-display [font-variant-numeric:tabular-nums] [@media(orientation:landscape)_and_(max-height:540px)]:text-[20px]',
  bannerText: 'text-[17px] leading-[1.3] font-[600] [@media(orientation:landscape)_and_(max-height:540px)]:text-[15px]',
  notice: `${notice} border-border text-[14px] font-[600]`,
  // Destino novo (usado sozinho): mais forte que os avisos de GPS, para ser lido de relance
  noticeStrong: `${notice} border-text text-[16px] font-bold`,

  recenter: [
    'absolute right-3 bottom-[calc(var(--panel-h)+10px)] min-h-11 cursor-pointer rounded-[999px] border-none bg-surface px-4 py-0 text-[15px] font-[700] text-text [box-shadow:0_4px_12px_rgba(0,0,0,0.2)]',
    // Acima do "i" dos créditos do mapa, que fica no canto
    '[@media(orientation:landscape)_and_(max-height:540px)]:right-[calc(env(safe-area-inset-right)+12px)] [@media(orientation:landscape)_and_(max-height:540px)]:bottom-[calc(env(safe-area-inset-bottom)+44px)]'
  ].join(' '),

  // Painel inferior
  panel: [
    'absolute right-0 bottom-0 left-0 flex flex-col gap-3 rounded-[18px_18px_0_0] bg-surface px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+14px)] text-text [box-shadow:0_-4px_16px_rgba(0,0,0,0.15)]',
    // Noite: sombra mais forte, para o painel se destacar do mapa escuro
    '[[data-theme=night]>&]:[box-shadow:0_-4px_16px_rgba(0,0,0,0.5)]',
    // Recolhido: só a alça e o resumo (chegada, minutos e distância)
    'data-nav-collapsed:gap-1 data-nav-collapsed:pb-[calc(env(safe-area-inset-bottom)+10px)]',
    '[@media(orientation:landscape)_and_(max-height:540px)]:right-auto [@media(orientation:landscape)_and_(max-height:540px)]:bottom-[calc(env(safe-area-inset-bottom)+10px)] [@media(orientation:landscape)_and_(max-height:540px)]:left-[calc(env(safe-area-inset-left)+10px)] [@media(orientation:landscape)_and_(max-height:540px)]:w-[min(380px,42%)] [@media(orientation:landscape)_and_(max-height:540px)]:rounded-2xl [@media(orientation:landscape)_and_(max-height:540px)]:px-3 [@media(orientation:landscape)_and_(max-height:540px)]:pt-1.5 [@media(orientation:landscape)_and_(max-height:540px)]:[box-shadow:0_4px_16px_rgba(0,0,0,0.25)]',
    // Recolhido ganha do celular deitado no espaçamento; o rodapé recolhido deitado é 8 px
    '[@media(orientation:landscape)_and_(max-height:540px)]:not-data-nav-collapsed:gap-2 [@media(orientation:landscape)_and_(max-height:540px)]:not-data-nav-collapsed:pb-2.5 [@media(orientation:landscape)_and_(max-height:540px)]:data-nav-collapsed:pb-2!'
  ].join(' '),

  // Para onde vai: endereço e referência (ou o hospital), com a pulseira da cor do chamado
  destination: [
    'flex items-start gap-2 pl-2.5 text-[16px] leading-[1.3] font-[700] [border-left:var(--pulseira-width)_solid_var(--risk-edge)]',
    '[&_.icon]:mt-px [&_.icon]:text-[18px] [&_.icon]:text-text-soft',
    '[&_span]:[display:-webkit-box] [&_span]:overflow-hidden [&_span]:[-webkit-box-orient:vertical] [&_span]:[-webkit-line-clamp:2]',
    // Recolhido: o destino cabe numa linha
    '[[data-nav-collapsed]_&_span]:[-webkit-line-clamp:1]',
    '[&_small]:[font-size:inherit] [&_small]:font-[500] [&_small]:text-text-soft'
  ].join(' '),

  summary: [
    'flex items-baseline gap-3',
    '[&_strong]:text-[26px] [&_strong]:font-display [&_strong]:text-text [&_strong]:[font-variant-numeric:tabular-nums] [[data-nav-collapsed]_&_strong]:text-[22px]',
    '[&_span]:text-[16px] [&_span]:text-text-muted',
    '[@media(orientation:landscape)_and_(max-height:540px)]:[&_strong]:text-[22px] [@media(orientation:landscape)_and_(max-height:540px)]:[&_span]:text-[14px]'
  ].join(' '),

  actions: 'flex gap-2',
  iconButton: `${panelButton} min-w-[52px] border border-border bg-surface text-[20px] text-text [@media(orientation:landscape)_and_(max-height:540px)]:min-w-11`,
  // Waze: a reserva se a nossa navegação falhar; não é o maior botão da tela
  mapsButton: `${panelButton} flex-[0_0_auto] border border-secondary-border bg-transparent px-4 py-0 text-center text-[15px] text-secondary-text no-underline [@media(orientation:landscape)_and_(max-height:540px)]:text-[14px]`,
  exitButton: `${panelButton} ml-auto border border-border-strong bg-surface px-[18px] py-0 text-[15px] text-text`,
  finish:
    'min-h-14 w-full cursor-pointer rounded-xl border-2 border-action-border bg-action text-[17px] font-bold text-on-action disabled:opacity-60 [@media(orientation:landscape)_and_(max-height:540px)]:min-h-11',

  // Marcadores
  vehicle: 'size-11 [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.35))] [&_svg]:block [&_svg]:size-full',

  // Aviso de ocorrência à frente, logo abaixo da instrução (o efeito aparece no ícone)
  incidentAlert: [
    'flex items-center gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-text [box-shadow:0_4px_14px_rgba(0,0,0,0.25)]',
    '[&_p]:flex [&_p]:min-w-0 [&_p]:flex-col [&_strong]:text-[18px] [&_strong]:font-bold',
    // Vale também para o span do ícone, como antes (o seletor do pai é mais específico)
    '[&_span]:text-[13px] [&_span]:text-text-muted',
    '[@media(orientation:landscape)_and_(max-height:540px)]:px-2.5 [@media(orientation:landscape)_and_(max-height:540px)]:py-1.5 [@media(orientation:landscape)_and_(max-height:540px)]:[&_strong]:text-[15px]'
  ].join(' '),
  incidentAlertIcon:
    'grid size-10 shrink-0 place-items-center rounded-[50%] [border:2px_var(--effect-line)_var(--effect-edge)] bg-(color:--effect-bg) text-[22px] text-(color:--effect-fg) [&_.icon]:align-[0]',

  // Relatar ocorrência: alvo grande à direita, acima do "Recentralizar" (como no Waze)
  report: [
    'absolute right-3 bottom-[calc(var(--panel-h)+70px)] flex min-h-[52px] cursor-pointer items-center gap-1.5 rounded-[999px] border border-border-strong bg-surface px-[18px] py-0 text-[16px] font-bold text-text [box-shadow:0_4px_12px_rgba(0,0,0,0.3)]',
    '[@media(orientation:landscape)_and_(max-height:540px)]:right-[calc(env(safe-area-inset-right)+12px)] [@media(orientation:landscape)_and_(max-height:540px)]:bottom-[calc(env(safe-area-inset-bottom)+98px)]'
  ].join(' '),

  // Limite da via e velocímetro: canto inferior esquerdo, acima do painel
  speed:
    'pointer-events-none absolute bottom-[calc(var(--panel-h)+10px)] left-3 flex items-end gap-2 [@media(orientation:landscape)_and_(max-height:540px)]:bottom-[calc(var(--panel-h)+20px)] [@media(orientation:landscape)_and_(max-height:540px)]:left-[calc(env(safe-area-inset-left)+10px)]',
  // Placa de regulamentação: círculo branco com borda vermelha (a placa de verdade, não a cor da classificação)
  speedLimit:
    'grid size-12 place-items-center rounded-[999px] border-5 border-[#dc2626] bg-white text-[18px] font-display text-[#111827] [box-shadow:0_2px_8px_rgba(0,0,0,0.3)]',
  speedometer: [
    'flex size-[60px] flex-col items-center justify-center rounded-[999px] bg-surface leading-none text-text [box-shadow:0_2px_8px_rgba(0,0,0,0.3)]',
    '[&_strong]:text-[22px] [&_strong]:font-display [&_small]:text-[12px] [&_small]:font-[700] [&_small]:text-text-muted',
    // Acima do limite: invertido e com contorno grosso
    'data-speeding:bg-primary data-speeding:text-on-primary data-speeding:outline-3 data-speeding:outline-offset-2 data-speeding:outline-primary data-speeding:[&_small]:[color:inherit]'
  ].join(' ')
};
