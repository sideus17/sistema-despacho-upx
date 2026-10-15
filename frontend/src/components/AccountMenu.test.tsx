import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../types';
import { renderWithAuth } from '../test/renderWithAuth';
import { AccountMenu } from './AccountMenu';

const openMenu = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /^Conta de/ }));
  return user;
};

describe('menu da conta', () => {
  it('abre com saudação, e-mail e tema; Esc fecha e devolve o foco à bolinha', async () => {
    renderWithAuth(<AccountMenu onSignOut={vi.fn()} />);
    const user = await openMenu();

    const menu = screen.getByRole('dialog', { name: 'Sua conta' });
    expect(menu).toHaveTextContent('Olá, Ana!');
    expect(menu).toHaveTextContent('ana@samu.test');
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Conta de/ })).toHaveFocus();
  });

  it('fecha ao tocar fora', async () => {
    renderWithAuth(<AccountMenu onSignOut={vi.fn()} />);
    const user = await openMenu();
    await user.click(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o Tab circula só dentro do menu', async () => {
    renderWithAuth(<AccountMenu onSignOut={vi.fn()} />);
    const user = await openMenu();
    const menu = screen.getByRole('dialog', { name: 'Sua conta' });
    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(menu).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('trocar o tema no menu muda o app', async () => {
    renderWithAuth(<AccountMenu onSignOut={vi.fn()} />);
    const user = await openMenu();
    await user.click(screen.getByRole('button', { name: 'Escuro' }));
    expect(screen.getByRole('button', { name: 'Escuro' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('samu:tema')).toBe('night');
  });

  it('cadastro incompleto: ponto na bolinha e atalho para completar', async () => {
    renderWithAuth(<AccountMenu onSignOut={vi.fn()} />, { cpf: null, missing: ['cpf'] });
    expect(screen.getByRole('button', { name: /cadastro incompleto/ })).toBeInTheDocument();
    await openMenu();
    expect(screen.getByRole('button', { name: /Complete seu cadastro/ })).toBeInTheDocument();
  });

  it('sair chama o encerramento da sessão', async () => {
    const onSignOut = vi.fn();
    renderWithAuth(<AccountMenu onSignOut={onSignOut} />);
    const user = await openMenu();
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});

describe('menu da conta no app da equipe', () => {
  const driver = { fullName: 'Lucas Martins', role: UserRole.MOTORISTA };

  it('encerrar turno pede confirmação', async () => {
    const onEnd = vi.fn(async () => {});
    renderWithAuth(<AccountMenu onSignOut={vi.fn()} shift={{ code: 'MOTO-01', onEnd }} />, driver);
    const user = await openMenu();

    await user.click(screen.getByRole('button', { name: /Encerrar turno/ }));
    expect(screen.getByText('Encerrar o turno na MOTO-01?')).toBeInTheDocument();
    expect(onEnd).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(onEnd).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('durante um atendimento não deixa encerrar o turno nem sair', async () => {
    const onSignOut = vi.fn();
    renderWithAuth(
      <AccountMenu
        onSignOut={onSignOut}
        shift={{ code: 'MOTO-01', onEnd: vi.fn() }}
        blockedReason="Finalize o atendimento antes de encerrar o turno ou sair."
      />,
      driver
    );
    await openMenu();

    expect(screen.getByRole('button', { name: /Encerrar turno/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeDisabled();
    expect(screen.getByText(/Finalize o atendimento/)).toBeInTheDocument();
  });
});
