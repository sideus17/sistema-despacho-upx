// Classes dos botões do mapa (antes MapControls.module.css)
export const styles = {
  // Canto inferior direito, acima dos créditos do mapa; com o mapa em meia tela no celular, mais justo
  controls:
    'absolute right-3 bottom-9 z-2 flex flex-col items-end gap-2.5 [@media(max-width:768px)]:right-2 [@media(max-width:768px)]:gap-2',
  // No grupo do zoom os botões perdem a forma própria e ganham a linha entre eles
  // (border-top por extenso: o border-none do botão zera o estilo da borda do Tailwind)
  zoom: 'flex flex-col overflow-hidden rounded-[999px] shadow-[0_2px_8px_rgba(0,0,0,0.25)] [&>button]:rounded-none [&>button]:shadow-none [&>button+button]:[border-top:1px_solid_var(--color-border)]',
  button:
    'grid size-11 cursor-pointer place-items-center rounded-[999px] border-none bg-surface text-[22px] text-text shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary [@media(max-width:768px)]:size-[38px] [@media(max-width:768px)]:text-[20px]'
};
