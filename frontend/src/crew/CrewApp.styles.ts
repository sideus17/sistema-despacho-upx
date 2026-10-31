// App da equipe (antes CrewApp.module.css). O celular deitado marca a casca com data-landscape;
// as regras `[[data-landscape]_&]:` são as que antes vinham de `.shellLandscape .x`

// Coluna única, mobile-first; no desktop fica centralizada
const shell = 'flex h-dvh mx-auto bg-surface [box-shadow:0_0_24px_rgba(0,0,0,0.08)] overflow-hidden';

// Status da viatura pela forma, como no mapa: livre com contorno, em atendimento preenchida,
// indisponível com contorno tracejado. No topo escuro (header), o mesmo código em claro
const pill =
  "inline-flex items-center gap-1.5 rounded-[999px] border-[1.5px] px-[9px] py-0.5 text-[12px] font-[700] before:size-[7px] before:rounded-[50%] before:bg-current before:content-['']";

// Base dos botões grandes da barra de ações (cada um põe borda, padding e tamanho de letra)
const button =
  'flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-app py-0 font-bold no-underline [[data-landscape]_&]:min-h-11';

const disabledWait = 'disabled:cursor-wait disabled:opacity-60';

// Escolha da viatura
const pickerItem =
  'flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-app border border-border bg-surface p-4 text-left active:bg-surface-muted';

// Botões cheios da equipe: tinta de dia; à noite, grafite com contorno (não uma placa clara na cabine)
const finish = `${button} w-full border-2 border-action-border bg-action px-4 text-[16px] text-on-action ${disabledWait}`;

export const styles = {
  shell: `${shell} max-w-[480px] flex-col`,
  // Celular deitado: coluna de informações e botões à esquerda (rola), mapa à direita na altura toda
  shellLandscape: `${shell} max-w-none flex-row`,
  sideColumn:
    'flex min-h-0 min-w-0 flex-[0_0_min(400px,42%)] flex-col overflow-y-auto border-r border-r-border',

  muted: 'text-[14px] leading-normal text-text-muted',

  // Carregamento
  centered: 'flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center',
  centeredTitle: 'text-[18px] font-[700]',
  offline: 'bg-tint-error-strong px-4 py-2 text-center text-[13px] font-[600] text-tint-error-text',

  // GPS com problema: o motorista precisa saber que a central o vê parado
  gpsBanner: [
    'flex items-center justify-between gap-2.5 bg-tint-error-strong py-2 pr-3 pl-4 text-[13px] font-medium text-tint-error-text',
    '[&_p]:flex [&_p]:items-center [&_p]:gap-1.5',
    '[&_button]:min-h-touch [&_button]:shrink-0 [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-current [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-0 [&_button]:text-[13px] [&_button]:font-bold [&_button]:text-inherit'
  ].join(' '),

  // Cabeçalho
  header: [
    'flex items-center justify-between gap-3 bg-header px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 text-white',
    '[[data-landscape]_&]:pt-[calc(env(safe-area-inset-top)+8px)] [[data-landscape]_&]:pr-3 [[data-landscape]_&]:pb-2 [[data-landscape]_&]:pl-[calc(env(safe-area-inset-left)+12px)]'
  ].join(' '),
  headerCode:
    'mb-1 text-[20px] font-display [&_span]:text-[13px] [&_span]:font-[600] [&_span]:opacity-85 [[data-landscape]_&]:mb-0.5 [[data-landscape]_&]:text-[17px]',

  pill_DISPONIVEL: `${pill} border-primary bg-surface text-text [header_&]:border-white [header_&]:bg-transparent [header_&]:text-white`,
  pill_EM_ATENDIMENTO: `${pill} border-primary bg-primary text-on-primary [header_&]:border-white [header_&]:bg-white [header_&]:text-[#111827]`,
  pill_INDISPONIVEL: `${pill} border-dashed border-text-muted bg-surface-hover text-text-soft [header_&]:border-[rgba(255,255,255,0.7)] [header_&]:bg-transparent [header_&]:text-white`,

  // Escolha da viatura
  picker:
    'flex-1 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)] [&_h1]:mb-1 [&_h1]:text-[24px] [&_h1]:font-display',
  pickerTop: '-mt-2 -mr-2 flex items-center justify-between gap-3',
  pickerList: 'mt-5 flex list-none flex-col gap-3',
  pickerItem: `${pickerItem} ${disabledWait}`,
  // Viatura com outro motorista em turno: aparece só para explicar por que não dá para escolher (usado no lugar do pickerItem)
  pickerItemTaken: `${pickerItem} disabled:cursor-not-allowed disabled:opacity-[0.55]`,
  pickerCode: 'text-[18px] font-bold text-text',
  // Base e distância até o celular
  pickerWhere: 'text-[14px] font-[600] text-text-soft',

  // Turno: o fundo cheio do escolhido (aria-selected) vem do indicador que desliza (SlidingThumb)
  typeFilters: 'mt-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none]',
  typeChip:
    'min-h-10 shrink-0 cursor-pointer rounded-[999px] border border-border bg-surface px-3.5 py-0 text-[14px] font-[700] text-text-muted aria-selected:border-transparent aria-selected:bg-transparent aria-selected:text-on-primary',

  // Conteúdo
  main: [
    'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-surface-muted p-4',
    '[[data-landscape]_&]:gap-2.5 [[data-landscape]_&]:py-2.5 [[data-landscape]_&]:pr-3 [[data-landscape]_&]:pl-[calc(env(safe-area-inset-left)+12px)]'
  ].join(' '),
  callCard:
    'rounded-app [border-left:var(--pulseira-width)_solid_var(--risk-edge)] bg-surface p-4 [box-shadow:0_1px_3px_rgba(0,0,0,0.08)] [[data-landscape]_&]:p-3',
  priority: 'text-[14px] font-bold tracking-[0.03em] uppercase',
  address: 'mt-1 mb-1.5 text-[20px] leading-[1.3] font-display [[data-landscape]_&]:text-[17px]',
  reference: '-mt-0.5 mb-1.5 text-[15px] leading-[1.4] font-[600]',
  description: 'text-[15px] leading-normal text-text-soft',
  // Sinais de alerta da triagem: ajudam a equipe a se preparar
  signals: 'mt-1 text-[14px] leading-[1.4] font-[700]',
  patient: 'mt-2 text-[13px] text-text-muted',

  // Etapa do atendimento (marcada pelo GPS) e hospital de destino
  progress: 'mt-2.5 flex flex-col gap-1.5 border-t border-t-border pt-2.5',
  stage:
    'self-start rounded-[999px] border border-tint-neutral-border bg-tint-neutral px-2.5 py-[3px] text-[14px] font-bold text-tint-neutral-text',
  timeline: 'text-[13px] [font-variant-numeric:tabular-nums] text-text-muted',
  hospitalRow: 'flex items-center justify-between gap-2 text-[15px]',
  hospitalButton:
    'min-h-touch cursor-pointer rounded-[999px] border border-primary bg-surface px-4 py-0 [font-family:inherit] [font-style:inherit] [font-variant:inherit] [font-stretch:inherit] [line-height:inherit] text-[14px] font-bold text-text',

  // Zoom da prévia no tamanho do polegar (o padrão do MapLibre tem 29 px; o CSS dele fica fora de camada, daí o !)
  mapWrap: [
    'relative min-h-[220px] flex-1 overflow-hidden rounded-app [box-shadow:0_1px_3px_rgba(0,0,0,0.12)] [&_.maplibregl-ctrl-group_button]:size-11!',
    '[[data-landscape]_&]:min-h-0 [[data-landscape]_&]:rounded-none [[data-landscape]_&]:[box-shadow:none]'
  ].join(' '),
  // Relatar ocorrência na via, sobre o mapa (canto livre: zoom à esquerda, créditos embaixo)
  reportButton:
    'absolute top-2.5 right-2.5 z-1 flex min-h-[52px] cursor-pointer items-center gap-1.5 rounded-[999px] border border-border-strong bg-surface px-4 py-0 text-[15px] font-bold text-text [box-shadow:0_3px_10px_rgba(0,0,0,0.3)]',
  routeInfo: 'flex gap-4 text-[15px]',

  // Rotas para escolher antes de sair: na barra, lado a lado; a escolhida leva aria-checked
  routeChoices: 'grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-1.5',
  routeChoice: [
    'flex min-h-[52px] min-w-0 cursor-pointer flex-col justify-center gap-0.5 rounded-app border border-border bg-surface px-2.5 py-1.5 text-left text-text [[data-landscape]_&]:min-h-11',
    '[&_strong]:text-[16px] [&_strong]:font-bold',
    '[&_span]:overflow-hidden [&_span]:text-[12px] [&_span]:text-ellipsis [&_span]:whitespace-nowrap [&_span]:text-text-muted',
    'aria-checked:border-primary aria-checked:bg-tint-neutral aria-checked:[box-shadow:0_0_0_2px_var(--color-primary)]'
  ].join(' '),

  idle: 'rounded-app bg-surface px-4 py-5 text-center [box-shadow:0_1px_3px_rgba(0,0,0,0.08)]',
  idleTitle: 'mb-1 text-[20px] font-display',
  // Pedido de permissão do aviso: o toque é o gesto que o iPhone exige
  pushButton:
    'mt-3.5 inline-flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-action-border bg-action px-4 py-0 text-[16px] font-[700] text-on-action',
  pushBlocked: 'mt-3 text-[14px] leading-[1.4] font-[700] text-text',

  // Barra de ações fixa na zona do polegar
  actionBar: [
    'flex flex-col gap-2 border-t border-t-border bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]',
    '[[data-landscape]_&]:gap-1.5 [[data-landscape]_&]:pt-2 [[data-landscape]_&]:pr-3 [[data-landscape]_&]:pb-[calc(env(safe-area-inset-bottom)+8px)] [[data-landscape]_&]:pl-[calc(env(safe-area-inset-left)+12px)]'
  ].join(' '),
  navRow: 'flex gap-2',
  navigate: `${button} flex-1 border-2 border-action-border bg-action px-4 text-[16px] whitespace-nowrap text-on-action ${disabledWait}`,
  // O Waze divide a linha com a navegação: compacto, pode quebrar em duas linhas
  mapsLink: `${button} border border-secondary-border bg-transparent px-2.5 text-center text-[14px] leading-[1.15] text-secondary-text`,
  finishEarly:
    'flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-secondary-border bg-transparent text-[14px] font-[700] text-secondary-text',
  finish,
  finishConfirm: `${finish} flex-[2]`,
  // No local e sem hospital: o próximo passo, na zona do polegar
  chooseHospital:
    'flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-app border-2 border-action-border bg-action text-[16px] font-bold text-on-action [[data-landscape]_&]:min-h-11',
  // Secundário: só contorno de dia e só texto à noite, para o principal (cheio) ser a próxima ação de relance
  secondaryButton: `${button} w-full flex-1 border border-secondary-border bg-transparent px-4 text-[16px] text-secondary-text ${disabledWait}`,

  // Convite para instalar o PWA
  install: 'flex items-center gap-2.5 bg-tint-neutral py-2.5 pr-3 pl-4 text-[13px] leading-[1.4] text-tint-neutral-text [&_span]:flex-1',
  installButton:
    'min-h-9 cursor-pointer rounded-lg border-2 border-action-border bg-action px-3.5 py-0 text-[13px] font-[700] text-on-action',
  installDismiss: 'grid size-9 cursor-pointer place-items-center border-none bg-transparent text-[18px] text-inherit'
};
