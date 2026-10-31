// Classes da busca de endereço (antes AddressSearch.module.css), escritas por extenso

export const styles = {
  field: 'relative flex items-center gap-2.5',
  // 16px evita o zoom automático do iOS; font: inherit desmontado para não disputar com o tamanho
  input:
    'h-11 min-w-0 flex-1 rounded-[10px] border border-transparent bg-surface-muted py-0 pr-10 pl-3.5 font-[family-name:inherit] [font-stretch:inherit] [font-style:inherit] [font-variant:inherit] text-[16px] leading-[inherit] [font-weight:inherit] text-text focus:border-primary focus:bg-surface',
  clear:
    'absolute right-1.5 grid size-8 cursor-pointer place-items-center rounded-[999px] border-none bg-transparent text-[18px] text-text-muted',
  list:
    'absolute top-[calc(100%+4px)] right-0 left-0 z-5 m-0 max-h-[300px] list-none overflow-y-auto rounded-xl border border-border bg-surface px-0 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.22)]',
  // A opção ativa (teclado) leva aria-selected
  option: 'flex min-h-12 cursor-pointer items-center gap-2.5 px-3 py-1.5 aria-selected:bg-surface-hover [&:hover]:bg-surface-hover',
  optionIcon: 'grid w-7 shrink-0 place-items-center text-[20px] text-text-muted',
  optionText: [
    'flex min-w-0 flex-col',
    '[&_:is(strong,small)]:overflow-hidden [&_:is(strong,small)]:text-ellipsis [&_:is(strong,small)]:whitespace-nowrap',
    '[&_strong]:text-[14px] [&_strong]:font-medium [&_strong]:text-text [&_small]:text-[12px] [&_small]:text-text-muted'
  ].join(' '),
  status: 'px-3.5 py-2.5 text-[13px] text-text-muted'
};
