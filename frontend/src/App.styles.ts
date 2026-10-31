// Layout da central: cabeçalho, mapa, lateral e abas (antes classes globais no index.css)
const hideBelow480 = '[@media(max-width:480px)]:hidden';

export const styles = {
  app: 'flex h-dvh flex-col overflow-hidden',
  header: 'z-100 shrink-0 border-b border-b-[rgba(255,255,255,0.08)] bg-header py-0 pr-2 pl-4 text-white',
  headerContent: 'flex h-14 items-center justify-between gap-4',
  headerBrand: 'flex items-center gap-2.5 text-[18px] font-[700] whitespace-nowrap',
  headerLogo: 'size-8 shrink-0 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.25)]',
  headerBrandName: '[@media(max-width:380px)]:hidden',
  headerActions: 'flex min-w-0 items-center gap-1',
  // Botão Gestão ↔ Operação
  headerView:
    'relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[999px] border border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.12)] px-3.5 py-0 text-[14px] font-[700] whitespace-nowrap text-white hover:bg-[rgba(255,255,255,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&_.icon]:text-[20px]',
  headerViewLong: hideBelow480,
  headerViewShort: 'hidden [@media(max-width:480px)]:inline',
  // Chamados esperando despacho enquanto a central está na gestão
  headerViewBadge: 'inline-grid h-5 min-w-5 place-items-center rounded-[999px] bg-white px-1.5 py-0 text-[12px] font-bold text-[#111827]',
  // Aviso de conexão: data-connection diz se está conectando ou com erro
  connectionBanner: [
    'flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2 text-center text-[13px] font-[600]',
    'data-[connection=connecting]:bg-tint-neutral-strong data-[connection=connecting]:text-tint-neutral-text',
    'data-[connection=error]:bg-tint-error-strong data-[connection=error]:text-tint-error-text',
    '[&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-md [&_button]:border [&_button]:border-current [&_button]:bg-surface [&_button]:px-3 [&_button]:py-0 [&_button]:font-[700] [&_button]:text-inherit'
  ].join(' '),
  // Na gestão a operação continua montada (mapa, formulário e alertas), só escondida
  mainContent: 'flex flex-1 overflow-hidden [&[hidden]]:hidden [@media(max-width:768px)]:flex-col',
  mapContainer: 'relative flex-1 bg-map-loading [@media(max-width:768px)]:h-1/2',
  sidebar:
    'z-10 flex w-[400px] flex-col bg-surface shadow-[-2px_0_8px_rgba(0,0,0,0.1)] [@media(min-width:769px)_and_(max-width:1024px)]:w-[350px] [@media(max-width:768px)]:h-1/2 [@media(max-width:768px)]:w-full',
  tabs: 'slide-group flex border-b border-b-border bg-surface-muted',
  // A aba escolhida leva aria-selected
  tab: [
    'relative flex flex-1 cursor-pointer flex-col items-center gap-0.5 bg-transparent px-1 py-2 text-[14px] font-[600] text-text-muted',
    '[border-style:none_none_solid] [border-width:0_0_3px] border-b-transparent',
    '[transition:color_var(--dur-fast)_var(--ease-out),background-color_var(--dur-fast)_var(--ease-out),border-color_var(--dur-fast)_var(--ease-out)]',
    'focus-visible:outline-offset-[-2px] [&_.icon]:text-[20px] [&_.icon]:align-[0]',
    'hover:not-aria-selected:bg-surface-hover hover:not-aria-selected:text-text',
    'aria-selected:bg-surface aria-selected:font-bold aria-selected:text-primary-text',
    '[@media(max-width:480px)]:px-2 [@media(max-width:480px)]:py-2.5 [@media(max-width:480px)]:text-[12px]'
  ].join(' '),
  // Chamado em preenchimento no "Novo" enquanto o atendente está em outra aba
  tabDot: 'absolute top-1.5 right-[calc(50%-18px)] size-2 rounded-[50%] bg-text',
  tabContent: [
    // O foco do teclado não para embaixo da barra fixa do Novo chamado
    'flex-1 scroll-pb-[96px] overflow-y-auto bg-surface-muted',
    '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface-muted [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-border-strong [&::-webkit-scrollbar-thumb:hover]:bg-text-muted'
  ].join(' ')
};
