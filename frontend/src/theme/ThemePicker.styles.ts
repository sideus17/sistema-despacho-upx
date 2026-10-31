export const styles = {
  // Pílula, como o indicador que desliza dentro dela
  picker: 'grid grid-cols-[repeat(3,1fr)] gap-0.5 rounded-full border border-border bg-surface-muted p-[3px]',
  // O fundo cheio do escolhido vem do indicador que desliza (SlidingThumb)
  option:
    'flex min-h-touch cursor-pointer flex-col items-center gap-0.5 rounded-full border-none bg-transparent px-1 py-1.5 text-[12px] font-medium text-text-muted [&_.icon]:align-[0] [&_.icon]:text-[18px] not-aria-pressed:hover:bg-surface-hover not-aria-pressed:hover:text-text aria-pressed:bg-transparent aria-pressed:text-on-primary'
};
