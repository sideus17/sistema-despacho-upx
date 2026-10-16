import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCall } from '../services/api';
import { CallPriority, EmergencyCall } from '../types';
import { renderWithAuth } from '../test/renderWithAuth';
import NewCallForm from './NewCallForm';

vi.mock('../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  createCall: vi.fn()
}));

beforeEach(() => {
  vi.mocked(createCall).mockReset();
  vi.mocked(createCall).mockResolvedValue({ id: 'call-1' } as EmergencyCall);
});

const color = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) });

async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Localização / Endereço'), 'Rua da Penha, 120');
  await user.type(screen.getByLabelText('O que aconteceu'), 'Dor no peito há 20 minutos');
}

describe('classificação de risco no novo chamado', () => {
  it('os sinais sugerem a cor mais grave, que já vem escolhida', async () => {
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} />);
    expect(screen.getByText('Sem sinais marcados: escolha a cor.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Febre' }));
    expect(color('Verde')).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: 'Dor forte no peito' }));
    expect(screen.getByText(/Sugerida pelos sinais/)).toHaveTextContent('Sugerida pelos sinais: Vermelho');
    expect(color('Vermelho')).toHaveAttribute('aria-checked', 'true');
  });

  it('o operador pode trocar a cor; mais branda que a sugerida, avisa', async () => {
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Falta de ar' }));
    await user.click(color('Azul'));
    expect(color('Azul')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('A cor escolhida é menos grave que a sugerida pelos sinais.')).toBeInTheDocument();
  });

  it('sem sinal e sem cor, não envia', async () => {
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} />);
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Abrir Chamado' }));
    expect(createCall).not.toHaveBeenCalled();
    expect(await screen.findByText('Escolha a classificação de risco.')).toBeInTheDocument();
  });

  it('envia a cor escolhida e os sinais com a sugestão', async () => {
    const user = userEvent.setup();
    const onCallCreated = vi.fn();
    renderWithAuth(<NewCallForm onCallCreated={onCallCreated} />);
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Dor forte no peito' }));
    await user.click(screen.getByRole('button', { name: 'Abrir Chamado' }));

    expect(createCall).toHaveBeenCalledWith(expect.objectContaining({
      priority: CallPriority.EMERGENCIA,
      triage: { signals: ['DOR_PEITO'], suggested: CallPriority.EMERGENCIA }
    }));
    expect(onCallCreated).toHaveBeenCalled();
    // Formulário limpo para o próximo chamado
    expect(screen.getByText('Sem sinais marcados: escolha a cor.')).toBeInTheDocument();
  });
});
