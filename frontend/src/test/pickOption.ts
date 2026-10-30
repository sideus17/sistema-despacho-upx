import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

// Escolhe uma opção do Select (React Aria): abre pelo botão do rótulo e clica na opção
export async function pickOption(user: UserEvent, label: RegExp, option: string | RegExp): Promise<void> {
  await user.click(screen.getByRole('button', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

// Os textos das opções, abrindo e fechando a lista
export async function optionTexts(user: UserEvent, label: RegExp): Promise<string[]> {
  await user.click(screen.getByRole('button', { name: label }));
  const texts = (await screen.findAllByRole('option')).map(option => option.textContent ?? '');
  await user.keyboard('{Escape}');
  return texts;
}
