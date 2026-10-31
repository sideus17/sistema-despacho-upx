// Mapa de calor da Gestão (antes HeatMap.module.css)
export const styles = {
  wrapper: 'absolute inset-0 bg-map-loading',
  // Contagem, filtro de cores e legenda no canto superior esquerdo; esmaece enquanto atualiza (aria-busy)
  panel:
    'absolute top-3 left-3 z-2 flex w-[min(320px,calc(100%-24px))] flex-col gap-2.5 rounded-[14px] bg-surface px-3.5 py-3 text-text [box-shadow:0_4px_16px_rgba(0,0,0,0.2)] [transition:opacity_var(--dur-fast)_var(--ease-out)] aria-busy:opacity-70 [@media(max-width:640px)]:top-2 [@media(max-width:640px)]:left-2 [@media(max-width:640px)]:gap-2 [@media(max-width:640px)]:px-3 [@media(max-width:640px)]:py-2.5',
  count: 'text-[15px]',
  filters: [
    'flex flex-wrap gap-1.5',
    '[&_button]:inline-flex [&_button]:min-h-[34px] [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-1.5 [&_button]:rounded-[999px] [&_button]:border [&_button]:border-border-strong [&_button]:bg-surface [&_button]:px-2.5 [&_button]:py-0 [&_button]:text-[13px] [&_button]:font-[600] [&_button]:text-text-muted',
    // Filtro ligado: preenchido, como os filtros da fila
    '[&_button[aria-pressed=true]]:border-primary [&_button[aria-pressed=true]]:bg-primary [&_button[aria-pressed=true]]:text-on-primary'
  ].join(' '),
  // Cor desligada: a bolinha fica vazada (o ! vence a cor do style)
  dot: 'size-2.5 rounded-[50%] in-aria-[pressed=false]:bg-transparent! in-aria-[pressed=false]:[box-shadow:inset_0_0_0_2px_var(--color-border-strong)]',
  scale: 'grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[12px] text-text-muted',
  ramp: 'h-2.5 rounded-[999px]',
  hint: 'text-[12px] text-text-muted [@media(max-width:640px)]:hidden',
  error:
    'text-[13px] text-tint-error-text [&_button]:ml-1.5 [&_button]:cursor-pointer [&_button]:border-none [&_button]:bg-transparent [&_button]:font-[700] [&_button]:text-inherit [&_button]:underline'
};
