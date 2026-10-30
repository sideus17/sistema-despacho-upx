import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('campo de senha', () => {
  it('o olho mostra e oculta a senha; enviar o formulário volta a ocultar', async () => {
    const user = userEvent.setup();
    render(
      <form onSubmit={event => event.preventDefault()}>
        <label>
          Senha
          <PasswordInput autoComplete="current-password" defaultValue="segredo" />
        </label>
      </form>
    );
    const input = screen.getByLabelText('Senha', { selector: 'input' });
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.submit(input.closest('form')!);
    expect(input).toHaveAttribute('type', 'password');
  });
});
