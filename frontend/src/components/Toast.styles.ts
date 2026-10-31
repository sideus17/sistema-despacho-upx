// Classes dos avisos (antes Toast.module.css). A entrada usa @keyframes toast-in do index.css
const toast =
  'pointer-events-auto flex items-start gap-2 rounded-[10px] px-4 py-3 text-[14px] leading-[1.4] font-medium shadow-[0_8px_24px_rgba(0,0,0,0.18)] animate-[toast-in_var(--dur-base)_var(--ease-out)] motion-reduce:animate-none';

export const styles = {
  // Abaixo do cabeçalho (56 px), que é da mesma tinta do aviso
  container:
    'pointer-events-none fixed top-[calc(env(safe-area-inset-top)+68px)] left-1/2 z-2000 flex w-[min(420px,calc(100vw-32px))] flex-col gap-2 [transform:translateX(-50%)]',
  // Sucesso e informação em tinta, com ícone; erro na superfície, com ícone e texto de erro
  success: `${toast} border border-[rgba(255,255,255,0.24)] bg-primary text-on-primary`,
  info: `${toast} border border-[rgba(255,255,255,0.24)] bg-primary text-on-primary`,
  error: `${toast} border border-tint-error-border bg-surface text-danger-text`,
  message: 'flex-1',
  typeIcon: 'mt-px text-[18px]',
  close:
    'my-[-4px] mr-[-8px] ml-0 grid size-7 shrink-0 cursor-pointer place-items-center rounded-[50%] border-none bg-[rgba(128,128,128,0.2)] text-[18px] [color:inherit] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current'
};
