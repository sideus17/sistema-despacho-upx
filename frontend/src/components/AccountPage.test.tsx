import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changePassword, getMe } from '../services/api';
import { Me, UserRole } from '../types';
import { OPERATOR, renderWithAuth } from '../test/renderWithAuth';
import { AccountPage } from './AccountPage';

vi.mock('../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getMe: vi.fn(),
  changePassword: vi.fn()
}));

const DRIVER: Me = {
  ...OPERATOR,
  fullName: 'Lucas Martins',
  role: UserRole.MOTORISTA
};

// A página busca o perfil completo ao abrir (o CPF não fica no aparelho)
async function openPage(profile: Me = OPERATOR) {
  vi.mocked(getMe).mockResolvedValue(profile);
  const onClose = vi.fn();
  const view = renderWithAuth(<AccountPage onClose={onClose} />, profile);
  await screen.findByText('Foto do perfil');
  return { ...view, onClose, user: userEvent.setup() };
}

beforeEach(() => {
  vi.mocked(getMe).mockReset();
  vi.mocked(changePassword).mockReset();
});

describe('Minha conta', () => {
  it('CPF aparece mascarado até tocar em "Mostrar"', async () => {
    const { user } = await openPage();
    expect(screen.getByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('529.982.247-25')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(screen.getByDisplayValue('529.982.247-25')).toBeInTheDocument();
  });

  it('salva só o que mudou', async () => {
    const { user, auth, onClose } = await openPage();
    const phone = screen.getByDisplayValue('(15) 99123-4567');
    await user.clear(phone);
    await user.type(phone, '15988887777');
    await user.click(screen.getByRole('button', { name: 'Médica' }));
    await user.click(screen.getByRole('button', { name: 'Turquesa' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(auth.updateMe).toHaveBeenCalledWith({ phone: '15988887777', avatar: 'medica', avatarColor: 'turquesa' });
    expect(onClose).toHaveBeenCalled();
  });

  it('sem mudança, o botão de salvar fica desligado', async () => {
    await openPage();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('conta antiga: avisa o que falta e não aceita CPF inválido', async () => {
    const { user, auth } = await openPage({ ...OPERATOR, cpf: null, phone: null, missing: ['cpf', 'phone'] });
    expect(screen.getByText('Complete seu cadastro: faltam CPF e celular.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('000.000.000-00'), '12345678900');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(screen.getByText('CPF inválido. Confira os números.')).toBeInTheDocument();
    expect(auth.updateMe).not.toHaveBeenCalled();
  });

  it('erro do servidor aparece na página e ela continua aberta', async () => {
    const { user, auth, onClose } = await openPage({ ...OPERATOR, cpf: null, missing: ['cpf'] });
    auth.updateMe.mockRejectedValueOnce({ response: { data: { error: 'Este CPF já está cadastrado em outra conta.' } } });

    await user.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Este CPF já está cadastrado em outra conta.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('motorista não vê mais a CNH (o grupo decidiu que não é pedida)', async () => {
    await openPage(DRIVER);
    expect(screen.queryByRole('region', { name: 'CNH' })).not.toBeInTheDocument();
    expect(screen.queryByText(/CNH/)).not.toBeInTheDocument();
  });

  it('troca de senha confere a confirmação antes de enviar', async () => {
    const { user } = await openPage();
    await user.click(screen.getByRole('button', { name: 'Alterar senha' }));
    await user.type(screen.getByLabelText('Senha atual'), 'senha-antiga');
    await user.type(screen.getByLabelText('Nova senha (mínimo 8 caracteres)'), 'senha-nova-1');
    await user.type(screen.getByLabelText('Confirme a nova senha'), 'senha-nova-2');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(screen.getByText('As senhas novas não conferem.')).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Confirme a nova senha'));
    await user.type(screen.getByLabelText('Confirme a nova senha'), 'senha-nova-1');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(changePassword).toHaveBeenCalledWith('senha-antiga', 'senha-nova-1');
  });

  it('Esc fecha a página', async () => {
    const { user, onClose } = await openPage();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
