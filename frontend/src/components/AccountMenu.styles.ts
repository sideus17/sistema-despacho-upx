// Item da lista (Encerrar turno, Sair); o de alerta troca fundo, cor e peso
const itemBase =
  'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border-none px-3.5 py-0 text-left text-[15px] [&_.icon]:text-[20px] [&_.icon]:text-text-muted [&_small]:ml-auto [&_small]:text-[12px] [&_small]:text-text-muted not-disabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50';

// Botões da confirmação de fim de turno
const confirmButton = 'min-h-10 flex-1 cursor-pointer rounded-lg text-[14px] font-bold disabled:cursor-wait disabled:opacity-60';

export const styles = {
  wrapper: 'relative shrink-0',
  trigger:
    'grid size-11 cursor-pointer place-items-center rounded-full border-none bg-transparent p-0 hover:bg-[rgba(128,128,128,0.25)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current aria-expanded:bg-[rgba(128,128,128,0.3)]',
  // Menu
  panel:
    'absolute top-[calc(100%+6px)] right-0 z-1000 max-h-[calc(100dvh-80px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-[20px] border border-border bg-surface px-2 pt-2 pb-3 text-left text-[14px] font-regular whitespace-normal text-text shadow-[0_12px_32px_rgba(0,0,0,0.25)]',
  top: 'relative flex min-h-10 items-center justify-center',
  role: 'text-[13px] font-medium text-text-muted',
  close:
    'absolute top-0 right-0 grid size-10 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[20px] text-text-muted hover:bg-surface-hover [&_.icon]:align-[0]',
  identity: 'flex flex-col items-center gap-1 px-3 pt-2 pb-4 text-center',
  greeting: 'mt-2 text-[20px] font-medium',
  fullName: 'text-[13px] text-text-muted',
  // Botão em pílula, como o "Gerenciar sua Conta do Google"
  manage:
    'mt-2.5 min-h-10 cursor-pointer rounded-full border border-border-strong bg-transparent px-5 py-0 text-[14px] font-medium text-primary-text hover:bg-tint-neutral',
  section: 'rounded-[14px] bg-surface-muted p-3',
  sectionTitle: 'mb-2 text-[12px] font-bold text-text-muted uppercase',
  // Itens
  actions: 'mt-2 flex flex-col gap-0.5',
  item: `${itemBase} bg-transparent font-medium text-text`,
  // Usado sozinho (já inclui o item): fundo e peso próprios sem disputar com os do item
  itemAlert: `${itemBase} mb-2 bg-tint-neutral font-bold text-tint-neutral-text`,
  blocked: 'px-3.5 pt-0.5 pb-1 text-[12px] font-medium text-text',
  // Confirmação de fim de turno
  confirm: 'rounded-xl border border-tint-error-border bg-tint-error px-3 py-2.5 font-medium text-tint-error-text',
  confirmRow: 'mt-2 flex gap-2',
  // Encerrar turno: contorno com texto de erro, sem fundo vermelho
  danger: `${confirmButton} border border-current bg-surface text-danger-text`,
  secondary: `${confirmButton} border border-border bg-surface text-text`,
  // Sobre
  about:
    'mt-2 border-t border-t-border px-3.5 py-0 text-[12px] leading-normal text-text-muted [&_p]:mt-1.5 [&_summary]:cursor-pointer [&_summary]:px-0 [&_summary]:pt-3 [&_summary]:pb-1 [&_summary]:text-center [&_summary]:font-medium'
};
