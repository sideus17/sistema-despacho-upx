import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCall, getRecentCalls, reversePlace, searchPlaces } from '../services/api';
import { CallPriority, CallStatus, Coordinates, EmergencyCall } from '../types';
import { renderWithAuth } from '../test/renderWithAuth';
import NewCallForm from './NewCallForm';

vi.mock('../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  createCall: vi.fn(),
  searchPlaces: vi.fn(),
  reversePlace: vi.fn(),
  getRecentCalls: vi.fn()
}));

beforeEach(() => {
  vi.mocked(createCall).mockReset();
  vi.mocked(createCall).mockResolvedValue({ id: 'call-1' } as EmergencyCall);
  vi.mocked(searchPlaces).mockReset();
  vi.mocked(searchPlaces).mockResolvedValue([]);
  vi.mocked(reversePlace).mockReset();
  vi.mocked(getRecentCalls).mockReset();
  vi.mocked(getRecentCalls).mockResolvedValue([]);
});

const color = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) });

async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Endereço'), 'Rua da Penha, 120');
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

  it('o atendente pode trocar a cor; mais branda que a sugerida, avisa', async () => {
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
    expect(screen.getByLabelText('Endereço')).toHaveValue('');
  });
});

describe('endereço do novo chamado', () => {
  it('texto sem sugestão vai como texto, para o servidor procurar; a referência vai junto', async () => {
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} />);
    await fillBasics(user);
    expect(screen.getByText(/Sem sugestão escolhida/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Ponto de referência/), '  em frente à padaria ');
    await user.click(color('Verde'));
    await user.click(screen.getByRole('button', { name: 'Abrir Chamado' }));

    expect(createCall).toHaveBeenCalledWith(expect.objectContaining({
      address: 'Rua da Penha, 120',
      location: undefined,
      reference: 'em frente à padaria'
    }));
  });

  it('sugestão escolhida vai com o ponto exato e o bairro', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([
      { label: 'Rua Maylasky, 54', detail: 'Centro, Sorocaba', location: { lat: -23.4993, lng: -47.4579 } }
    ]);
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} />);
    await user.type(screen.getByLabelText('Endereço'), 'Rua Maylasky, 54');
    await user.click(await screen.findByRole('option', { name: /Rua Maylasky, 54/ }));
    expect(screen.getByText(/Local confirmado · Centro, Sorocaba/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('O que aconteceu'), 'Queda em casa');
    await user.click(color('Amarelo'));
    await user.click(screen.getByRole('button', { name: 'Abrir Chamado' }));
    expect(createCall).toHaveBeenCalledWith(expect.objectContaining({
      address: 'Rua Maylasky, 54 - Centro, Sorocaba',
      location: { lat: -23.4993, lng: -47.4579 }
    }));
  });

  it('rua sem o número na base: aviso de ponto aproximado, e o número fica no endereço', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([
      { label: 'Avenida Gisele Constantino, 1850', detail: 'Parque Campolim, Sorocaba', location: { lat: -23.538, lng: -47.466 }, approximate: true }
    ]);
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} />);
    await user.type(screen.getByLabelText('Endereço'), 'Av Gisele Constantino 1850');
    await user.click(await screen.findByRole('option', { name: /Parque Campolim, Sorocaba · ponto aproximado/ }));
    expect(screen.getByText(/Ponto aproximado: achamos a rua, não o número/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('O que aconteceu'), 'Queda');
    await user.click(color('Verde'));
    await user.click(screen.getByRole('button', { name: 'Abrir Chamado' }));
    expect(createCall).toHaveBeenCalledWith(expect.objectContaining({ address: 'Avenida Gisele Constantino, 1850 - Parque Campolim, Sorocaba' }));
  });

  it('"Escolher no mapa": o ponto clicado vira o local, com o nome da rua mais próxima', async () => {
    vi.mocked(reversePlace).mockResolvedValue({ label: 'Rua da Penha, 890', detail: 'Centro, Sorocaba', location: { lat: 0, lng: 0 } });
    let pick: ((location: Coordinates) => void) | undefined;
    const onDraftChange = vi.fn();
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} onPickOnMap={onPick => { pick = onPick; }} onDraftChange={onDraftChange} />);

    await user.click(screen.getByLabelText('Endereço'));
    await user.click(screen.getByRole('option', { name: 'Escolher no mapa' }));
    const point = { lat: -23.5101, lng: -47.4612 };
    await act(async () => pick!(point));

    await waitFor(() => expect(screen.getByLabelText('Endereço')).toHaveValue('Rua da Penha, 890'));
    expect(onDraftChange).toHaveBeenLastCalledWith(point);

    await user.type(screen.getByLabelText('O que aconteceu'), 'Desmaio');
    await user.click(color('Amarelo'));
    await user.click(screen.getByRole('button', { name: 'Abrir Chamado' }));
    expect(createCall).toHaveBeenCalledWith(expect.objectContaining({ address: 'Rua da Penha, 890 - Centro, Sorocaba', location: point }));
  });
});

describe('telefone de quem ligou', () => {
  it('fixo ou celular com máscara; vai só com os dígitos', async () => {
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} />);
    const phone = screen.getByLabelText(/Telefone de quem ligou/);
    await user.type(phone, '1532321234');
    expect(phone).toHaveValue('(15) 3232-1234');

    await fillBasics(user);
    await user.click(color('Verde'));
    await user.click(screen.getByRole('button', { name: 'Abrir Chamado' }));
    expect(createCall).toHaveBeenCalledWith(expect.objectContaining({ callerPhone: '1532321234' }));
  });

  it('telefone incompleto não envia', async () => {
    const user = userEvent.setup();
    renderWithAuth(<NewCallForm onCallCreated={vi.fn()} />);
    await user.type(screen.getByLabelText(/Telefone de quem ligou/), '159912');
    await fillBasics(user);
    await user.click(color('Verde'));
    await user.click(screen.getByRole('button', { name: 'Abrir Chamado' }));
    expect(createCall).not.toHaveBeenCalled();
    expect(screen.getByText('Telefone incompleto ou inválido.')).toBeInTheDocument();
  });

  it('mesmo telefone nas últimas horas: avisa e deixa ver o chamado no mapa', async () => {
    const previous = {
      id: 'call-antigo',
      priority: CallPriority.URGENTE,
      status: CallStatus.EM_ATENDIMENTO,
      ambulance_id: 'amb-1',
      timestamp: new Date(Date.now() - 20 * 60_000).toISOString(),
      address: 'Rua da Penha, 890 - Centro, Sorocaba',
      location: { lat: -23.501, lng: -47.4617 },
      description: 'Queda',
      patientInfo: { symptoms: 'Queda' }
    } as EmergencyCall;
    vi.mocked(getRecentCalls).mockResolvedValue([{ call: previous, reasons: ['telefone'], distance: null }]);
    const onShowCall = vi.fn();
    const user = userEvent.setup();
    renderWithAuth(
      <NewCallForm onCallCreated={vi.fn()} onShowCall={onShowCall} ambulances={[{ id: 'amb-1', code: 'USA-01' } as any]} />
    );
    await user.type(screen.getByLabelText(/Telefone de quem ligou/), '15991234567');

    expect(await screen.findByText('Possível chamado repetido')).toBeInTheDocument();
    expect(getRecentCalls).toHaveBeenCalledWith({ phone: '15991234567', location: undefined }, expect.any(AbortSignal));
    expect(screen.getByText('Mesmo telefone · 20 minutos atrás')).toBeInTheDocument();
    expect(screen.getByText(/Amarelo · Em atendimento · USA-01/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver no mapa' }));
    expect(onShowCall).toHaveBeenCalledWith(previous);
  });
});
