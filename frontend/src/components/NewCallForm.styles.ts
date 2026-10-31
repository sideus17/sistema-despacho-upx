// Classes do formulário de novo chamado (antes NewCallForm.module.css), escritas por extenso

// Dica abaixo do endereço; a de ponto aproximado troca cor e peso e deixa o ícone na cor do texto
const placeHintBase = 'mt-1.5 flex items-center gap-1 text-[12px] leading-[1.4] [&_svg]:shrink-0';

export const styles = {
  container: 'p-4',
  title: 'mb-2 text-[20px] font-bold text-text',
  intro: 'mb-4 text-[13px] leading-normal text-text-muted',
  form: 'flex flex-col gap-3',
  label: 'mb-1.5 block text-[13px] font-medium text-text-soft',
  // abaixo de 16px o iOS dá zoom ao focar o campo
  input:
    'w-full rounded-lg border border-border-strong bg-surface p-2.5 font-[family-name:inherit] text-[16px] text-text aria-invalid:border-danger-text [textarea&]:resize-y',

  // Barra fixa no pé do painel enquanto o formulário rola: "Abrir chamado" sempre à vista, com fundo
  // próprio na largura toda; o degradê curto acima dela faz o campo que passa por baixo sumir aos poucos
  submitBar: [
    'sticky bottom-0 z-1 -mx-4 mt-1 -mb-4 border-t border-t-border bg-surface-muted px-4 pt-3 pb-4',
    "before:pointer-events-none before:absolute before:right-0 before:bottom-full before:left-0 before:h-4 before:bg-[linear-gradient(to_bottom,transparent,var(--color-surface-muted))] before:content-['']"
  ].join(' '),
  submit:
    'min-h-11 w-full cursor-pointer rounded-lg border-none bg-primary p-3 text-[14px] font-bold text-on-primary disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-text-muted',
  row: 'grid grid-cols-[1fr_1.4fr] gap-2.5',

  // O campo de endereço (AddressSearch) com a mesma cara dos outros campos
  address:
    '[&_input]:h-[42px] [&_input]:rounded-lg [&_input]:border [&_input]:border-border-strong [&_input]:bg-surface',
  placeHint: `${placeHintBase} text-text-muted [&_svg]:text-text`,
  // Usado sozinho (já inclui a dica)
  placeApproximate: `${placeHintBase} font-medium text-tint-neutral-text`,
  optional: 'font-regular text-text-muted',
  fieldError: 'mt-1.5 text-[12px] font-medium text-danger-text',

  // Possível chamado repetido: aviso com cada chamado parecido
  repeat:
    'flex flex-col gap-2 rounded-[10px] border border-tint-neutral-border bg-tint-neutral px-3 py-2.5 text-[13px] text-tint-neutral-text [&_small]:text-[12px]',
  repeatTitle: 'm-0 flex items-center gap-1.5 font-bold',
  repeatList:
    'm-0 flex list-none flex-col gap-1.5 p-0 [&_li]:flex [&_li]:items-center [&_li]:gap-2.5 [&_li]:rounded-lg [&_li]:bg-surface [&_li]:px-2.5 [&_li]:py-2 [&_li]:text-text',
  repeatText:
    'flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.35] [&_span]:overflow-hidden [&_span]:text-[12px] [&_span]:text-ellipsis [&_span]:whitespace-nowrap [&_span]:text-text-muted',
  // font: inherit desmontado, para o tamanho e o peso não disputarem com o atalho
  repeatShow:
    'shrink-0 cursor-pointer rounded-[999px] border border-border-strong bg-surface px-2.5 py-1.5 font-[family-name:inherit] [font-stretch:inherit] [font-style:inherit] [font-variant:inherit] text-[12px] leading-[inherit] font-medium text-text hover:bg-surface-hover'
};
