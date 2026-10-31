// Classes do painel de regulação (antes RegulationPanel.module.css)

const button = 'min-h-touch flex-1 cursor-pointer rounded-lg px-3.5 py-0 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-60';

export const styles = {
  container: 'flex flex-col gap-3 p-4',
  back: 'min-h-9 cursor-pointer self-start border-none bg-transparent p-0 text-[14px] font-medium text-primary-text hover:underline hover:underline-offset-3',
  // Foco de programa ao abrir o passo, não de teclado
  title: 'm-0 text-[20px] font-bold text-text focus:[outline:none]',
  notice:
    'rounded-[10px] border border-tint-neutral-border bg-tint-neutral px-3.5 py-3 text-[14px] leading-normal text-tint-neutral-text',

  // Resumo do chamado, com a pulseira na cor escolhida
  summary:
    'flex flex-col gap-1 rounded-app border border-border border-l-[length:var(--pulseira-width)] border-l-(--risk-edge) bg-surface px-4 py-3.5',
  // Quebra a linha: a espera crítica com a meta não cabe ao lado da cor no painel de 400 px
  summaryHeader: 'mb-0.5 flex flex-wrap items-center justify-between gap-2',
  address: 'text-[15px] leading-[1.4] font-bold',
  muted: 'text-[13px] leading-[1.4] text-text-muted',
  description: 'text-[13px] leading-normal text-text-soft',
  patient: [
    'mt-1 flex flex-wrap gap-3 text-[13px] text-text-soft',
    '[&_:is(span,a)]:inline-flex [&_:is(span,a)]:items-center [&_:is(span,a)]:gap-1',
    '[&_a]:font-medium [&_a]:text-primary-text [&_a]:underline [&_a]:underline-offset-2'
  ].join(' '),

  // Também vai no Select: o ! vence o gap-1 do próprio Select
  field: [
    'flex flex-col gap-1.5! text-[13px] font-medium text-text-soft',
    '[&_em]:font-regular [&_em]:text-text-muted [&_em]:not-italic',
    // abaixo de 16px o iOS dá zoom ao focar o campo
    '[&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-border-strong [&_textarea]:bg-surface [&_textarea]:p-2.5 [&_textarea]:[font-family:inherit] [&_textarea]:text-[16px] [&_textarea]:font-regular [&_textarea]:text-text'
  ].join(' '),
  actions: 'flex flex-col gap-2',
  closing: 'flex flex-col gap-2',
  secondaryRow: 'flex gap-2 [@media(max-width:380px)]:flex-col',
  // Vermelho ou Amarelo encerrado sem viatura: a confirmação fica no lugar do botão, com o porquê
  confirmSevere:
    'flex flex-col gap-2.5 rounded-[10px] border border-tint-error-border bg-tint-error px-3.5 py-3 text-[14px] leading-normal text-tint-error-text',

  primary: `${button} border-none bg-primary text-on-primary`,
  secondary: `${button} border border-border-strong bg-surface text-text not-disabled:hover:bg-surface-hover not-disabled:hover:text-text`,
  // Ação que encerra o chamado: contorno com texto de erro, sem fundo vermelho
  danger: `${button} border border-current bg-surface text-danger-text not-disabled:hover:bg-tint-error`,
  ghost: `${button} border border-border bg-transparent text-text-muted not-disabled:hover:bg-surface-hover not-disabled:hover:text-text`,

  reasons: [
    'grid grid-cols-[repeat(2,1fr)] gap-1.5 rounded-[10px] border border-border px-3 py-2.5 [@media(max-width:380px)]:grid-cols-[1fr]',
    '[&_legend]:px-1 [&_legend]:py-0 [&_legend]:text-[13px] [&_legend]:font-medium [&_legend]:text-text-soft'
  ].join(' '),
  reason: 'flex min-h-8 cursor-pointer items-center gap-1.5 text-[14px] text-text'
};
