import type { KeyboardEvent } from 'react';

// Ctrl+Enter (ou Cmd+Enter) aciona o botão principal do passo aberto: o que estiver marcado com
// data-ctrl-enter e habilitado. Uma confirmação de risco não é marcada: ela pede o clique de propósito
export function pressCtrlEnterAction(event: KeyboardEvent<HTMLElement>) {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
  const action = event.currentTarget.querySelector<HTMLButtonElement>('[data-ctrl-enter]:not(:disabled)');
  if (!action) return;
  event.preventDefault();
  action.click();
}
