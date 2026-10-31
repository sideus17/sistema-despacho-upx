// Classes das telas de login, cadastro, código do autenticador e senha (antes auth.module.css), escritas por extenso:
// o Tailwind só gera as que encontra no código, não as montadas em tempo de execução

const button = 'flex w-full min-h-12 cursor-pointer items-center justify-center rounded-[10px] text-[16px] font-bold no-underline';
const link = 'min-h-11 cursor-pointer border-none bg-transparent px-2 py-1 font-bold text-primary-text underline underline-offset-2';

export const styles = {
  page:
    'flex min-h-dvh items-center justify-center bg-background px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]',
  card: 'w-full max-w-[420px] rounded-[18px] bg-surface px-6 py-7 shadow-[0_16px_40px_rgba(15,23,42,0.18)]',
  brand: 'mb-5 flex items-center gap-2.5 text-[15px] font-bold text-text',
  title: 'mb-1 text-[24px] font-display',
  subtitle: 'mb-5 text-[14px] leading-normal text-text-muted',

  // Formulário
  form: 'flex flex-col gap-3.5',
  field: [
    'flex flex-col gap-1.5',
    '[&>span]:text-[13px] [&>span]:font-medium [&>span]:text-text-soft',
    // abaixo de 16px o iOS dá zoom ao focar
    '[&_:is(input,select)]:min-h-touch [&_:is(input,select)]:w-full [&_:is(input,select)]:rounded-[10px] [&_:is(input,select)]:border [&_:is(input,select)]:border-border-strong [&_:is(input,select)]:bg-surface [&_:is(input,select)]:px-3 [&_:is(input,select)]:text-[16px] [&_:is(input,select)]:text-text',
    '[&_:is(input,select):focus]:border-transparent [&_:is(input,select):focus]:outline-2 [&_:is(input,select):focus]:outline-offset-1 [&_:is(input,select):focus]:outline-primary'
  ].join(' '),
  hint: 'text-[12px] leading-[1.4] text-text-muted',

  // Escolha da função: o cartão marcado leva data-selected
  roles: 'flex flex-col gap-2 border-none [&_legend]:mb-1.5 [&_legend]:text-[13px] [&_legend]:font-medium [&_legend]:text-text-soft',
  roleCard: [
    'group flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3.5 py-3',
    '[&_input]:pointer-events-none [&_input]:absolute [&_input]:opacity-0',
    'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary',
    'data-selected:border-primary data-selected:bg-tint-neutral data-selected:shadow-[0_0_0_1px_var(--color-primary)]',
    '[&_strong]:block [&_strong]:text-[15px] [&_small]:text-[12px] [&_small]:text-text-muted'
  ].join(' '),
  roleIcon:
    'grid size-11 shrink-0 place-items-center rounded-xl bg-tint-neutral text-[22px] text-primary-text group-data-selected:bg-primary group-data-selected:text-on-primary [&_.icon]:[vertical-align:0]',

  // Botões e links
  primary: `${button} mt-1 border-none bg-primary text-on-primary disabled:cursor-wait disabled:opacity-60`,
  secondary: `${button} border border-primary bg-tint-neutral text-primary-text`,
  link: `${link} text-[14px]`,
  // "Esqueci a senha", logo abaixo do campo
  forgot: `${link} -mt-1.5 self-end text-[13px]`,
  switch: 'mt-[18px] text-center text-[14px] text-text-muted',
  // Aviso neutro (link enviado)
  notice: 'mb-[18px] rounded-[10px] border border-tint-neutral-border bg-tint-neutral px-3.5 py-3 text-[14px] leading-normal text-tint-neutral-text',
  error: 'rounded-lg bg-tint-error-strong px-3 py-2.5 text-[13px] leading-[1.4] font-medium text-tint-error-text',

  // Código do autenticador
  steps: 'mb-4 ml-[18px] flex flex-col gap-3 text-[14px] leading-normal text-text-soft',
  enroll: 'mt-2.5 flex flex-col items-center gap-2.5',
  qr: 'size-44 rounded-xl border border-border bg-white p-2',
  secret:
    'flex max-w-full flex-wrap items-center justify-center gap-1.5 [&_code]:rounded-md [&_code]:bg-surface-muted [&_code]:px-2.5 [&_code]:py-1.5 [&_code]:text-[12px] [&_code]:break-all',
  code: `mb-2.5 min-h-14 w-full rounded-xl border border-border-strong bg-surface indent-[0.4em] font-[family-name:ui-monospace,SFMono-Regular,Menlo,monospace] text-center text-[28px] font-bold tracking-[0.4em] text-text focus:border-transparent focus:outline-2 focus:outline-offset-1 focus:outline-primary`,
  spinner: 'my-4'
};
