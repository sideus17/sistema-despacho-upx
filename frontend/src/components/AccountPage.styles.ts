// Botões
const button =
  'min-h-touch cursor-pointer rounded-[10px] px-[18px] py-0 text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-55';

export const styles = {
  // Acima da navegação (1500) e do relato (1700), abaixo dos avisos (2000)
  // Celular: tela cheia
  backdrop: 'fixed inset-0 z-1800 grid place-items-center bg-[rgba(0,0,0,0.45)] p-6 [@media(max-width:600px)]:p-0',
  page:
    'flex max-h-[calc(100dvh-48px)] w-[min(560px,100%)] flex-col overflow-hidden rounded-[20px] bg-surface text-text shadow-[0_16px_40px_rgba(0,0,0,0.3)] [@media(max-width:600px)]:h-dvh [@media(max-width:600px)]:max-h-none [@media(max-width:600px)]:w-full [@media(max-width:600px)]:rounded-none',
  header:
    'flex items-center gap-2 border-b border-b-border px-3 py-2.5 [&_h2]:text-[18px] [&_h2]:font-bold [@media(max-width:600px)]:pt-[calc(env(safe-area-inset-top)+10px)]',
  close:
    'grid size-10 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[22px] text-text-muted hover:bg-surface-hover [&_.icon]:align-[0]',
  body: 'flex flex-1 flex-col gap-3.5 overflow-y-auto bg-surface-muted p-4 [@media(max-width:600px)]:p-3',
  // O botão solto na seção (Alterar senha) não estica: era `.section > .secondary`
  section:
    'flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 [&_h3]:text-[16px] [&_h3]:font-bold [&>button]:self-start',
  missing:
    'rounded-[10px] border border-tint-neutral-border bg-tint-neutral px-3 py-2.5 text-[13px] leading-[1.4] font-medium text-tint-neutral-text',
  // Foto
  preview: 'flex justify-center',
  label: 'text-[12px] font-bold text-text-muted uppercase',
  photoActions: 'flex flex-wrap justify-center gap-2',
  // Título da seção com o "Editar" à direita
  sectionHeader: 'flex items-center justify-between gap-3',
  // Celular: as 8 cores em duas linhas de 4, com o alvo de toque de 44 px
  colors:
    'flex flex-wrap gap-2.5 [@media(max-width:600px)]:grid [@media(max-width:600px)]:grid-cols-[repeat(4,1fr)] [@media(max-width:600px)]:justify-items-center [@media(max-width:600px)]:gap-2',
  color:
    'grid size-10 cursor-pointer place-items-center rounded-full border-3 border-surface text-[22px] text-white shadow-[0_0_0_1px_var(--color-border)] aria-pressed:shadow-[0_0_0_2px_var(--color-text)] [&_.icon]:align-[0] [@media(max-width:600px)]:size-11',
  // Campos (data-invalid no rótulo quando há erro: era `.field:has(.fieldError)`)
  // font: inherit sai depois do text-[16px] no CSS gerado e apagaria o tamanho: por isso o `!` no text-[16px]
  // O erro vence a borda transparente do foco (no CSS, o :has vinha depois com a mesma especificidade): por isso o `!`
  field:
    'flex min-w-0 flex-col gap-1.5 [&>span]:text-[13px] [&>span]:font-medium [&>span]:text-text-soft [&_:is(input,select)]:min-h-touch [&_:is(input,select)]:w-full [&_:is(input,select)]:rounded-[10px] [&_:is(input,select)]:border [&_:is(input,select)]:border-border-strong [&_:is(input,select)]:bg-surface [&_:is(input,select)]:px-3 [&_:is(input,select)]:py-0 [&_:is(input,select)]:[font:inherit] [&_:is(input,select)]:text-[16px]! [&_:is(input,select)]:text-text [&_:is(input,select):focus]:border-transparent [&_:is(input,select):focus]:outline-2 [&_:is(input,select):focus]:outline-offset-1 [&_:is(input,select):focus]:outline-primary data-invalid:[&_:is(input,select)]:border-danger-text!',
  hint: 'text-[12px] leading-[1.4] text-text-muted',
  fieldError: 'text-[12px] font-medium text-tint-error-text',
  // CPF oculto com o olho, como o campo de senha
  secret: 'inline-flex items-center gap-0.5 tracking-[0.04em]',
  eye: 'my-[-10px] mr-[-12px] ml-0 grid size-touch cursor-pointer place-items-center rounded-full border-none bg-transparent text-[20px] text-text-muted hover:bg-surface-hover hover:text-text',
  readonly:
    'flex flex-col gap-2 [&_dd]:text-right [&_dd]:font-medium [&_dd]:break-all [&_div]:flex [&_div]:justify-between [&_div]:gap-3 [&_div]:text-[14px] [&_dt]:text-text-muted',
  passwordForm: 'flex flex-col gap-3',
  // Celular: os botões dividem a linha
  inlineActions: 'flex justify-end gap-2 [@media(max-width:600px)]:[&>*]:flex-1',
  primary: `${button} border-none bg-primary text-on-primary`,
  secondary: `${button} border border-border-strong bg-surface text-text`,
  error: 'rounded-lg bg-tint-error-strong px-3 py-2.5 text-[13px] leading-[1.4] font-medium text-tint-error-text',
  spinner: 'mx-auto my-10'
};
