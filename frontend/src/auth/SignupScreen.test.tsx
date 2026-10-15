import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signUp } from '../services/api';
import { supabase } from '../lib/supabase';
import SignupScreen from './SignupScreen';

vi.mock('../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  signUp: vi.fn()
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(async () => ({ error: null })) } }
}));

beforeEach(() => {
  vi.mocked(signUp).mockReset();
});

async function fillCommon(user: ReturnType<typeof userEvent.setup>, role: 'Motorista' | 'Operador') {
  await user.click(screen.getByText(role));
  await user.type(screen.getByLabelText('Nome completo'), 'Lucas Martins');
  await user.type(screen.getByLabelText('CPF'), '52998224725');
  await user.type(screen.getByLabelText(/^Celular com DDD/), '15991234567');
  await user.type(screen.getByLabelText('E-mail'), 'lucas@samu.test');
  await user.type(screen.getByLabelText('Senha (mínimo 8 caracteres)'), 'senha-segura');
  await user.type(screen.getByLabelText('Confirme a senha'), 'senha-segura');
}

describe('cadastro', () => {
  it('CNH só para motorista; código da central só para operador', async () => {
    const user = userEvent.setup();
    render(<SignupScreen onLogin={vi.fn()} />);
    expect(screen.queryByLabelText(/^Número de registro/)).not.toBeInTheDocument();

    await user.click(screen.getByText('Motorista'));
    expect(screen.getByLabelText(/^Número de registro/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Código da central/)).not.toBeInTheDocument();

    await user.click(screen.getByText('Operador'));
    expect(screen.queryByLabelText(/^Número de registro/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Código da central/)).toBeInTheDocument();
  });

  it('máscaras no CPF e no celular', async () => {
    const user = userEvent.setup();
    render(<SignupScreen onLogin={vi.fn()} />);
    await user.type(screen.getByLabelText('CPF'), '52998224725');
    await user.type(screen.getByLabelText(/^Celular com DDD/), '15991234567');
    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');
    expect(screen.getByLabelText(/^Celular com DDD/)).toHaveValue('(15) 99123-4567');
  });

  it('motorista: envia só os dígitos e a CNH, e já entra na conta', async () => {
    const user = userEvent.setup();
    render(<SignupScreen onLogin={vi.fn()} />);
    await fillCommon(user, 'Motorista');
    await user.type(screen.getByLabelText(/^Número de registro/), '52601815980');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'AB');
    await user.type(screen.getByLabelText('Validade'), '2031-08-20');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(signUp).toHaveBeenCalledWith({
      fullName: 'Lucas Martins',
      email: 'lucas@samu.test',
      password: 'senha-segura',
      role: 'MOTORISTA',
      cpf: '52998224725',
      phone: '15991234567',
      cnh: { number: '52601815980', category: 'AB', expiresOn: '2031-08-20' },
      inviteCode: undefined
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'lucas@samu.test', password: 'senha-segura' });
  });

  it('CNH com dígito errado não é enviada', async () => {
    const user = userEvent.setup();
    render(<SignupScreen onLogin={vi.fn()} />);
    await fillCommon(user, 'Motorista');
    await user.type(screen.getByLabelText(/^Número de registro/), '52601815981');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'B');
    await user.type(screen.getByLabelText('Validade'), '2031-08-20');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Número da CNH inválido');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('avisa quando a CNH está vencida', async () => {
    const user = userEvent.setup();
    render(<SignupScreen onLogin={vi.fn()} />);
    await user.click(screen.getByText('Motorista'));
    await user.type(screen.getByLabelText('Validade'), '2020-01-31');
    expect(screen.getByText(/CNH está vencida/)).toBeInTheDocument();
  });

  it('mensagem do servidor aparece (ex.: CPF já cadastrado)', async () => {
    vi.mocked(signUp).mockRejectedValueOnce({ response: { data: { error: 'Este CPF já está cadastrado em outra conta.' } } });
    const user = userEvent.setup();
    render(<SignupScreen onLogin={vi.fn()} />);
    await fillCommon(user, 'Operador');
    await user.type(screen.getByLabelText(/^Código da central/), 'CENTRAL');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este CPF já está cadastrado em outra conta.');
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ role: 'OPERADOR', cnh: undefined, inviteCode: 'CENTRAL' }));
  });
});
