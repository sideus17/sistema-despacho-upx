import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPendingCalls, getStats } from './services/api';
import { CallPriority, CallStatus, EmergencyCall } from './types';
import { renderWithAuth } from './test/renderWithAuth';
import App from './App';

vi.mock('./services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('./services/api')>()),
  getAmbulances: vi.fn(async () => []),
  getPendingCalls: vi.fn(async () => []),
  getBases: vi.fn(async () => []),
  getIncidents: vi.fn(async () => []),
  getHospitals: vi.fn(async () => []),
  getStats: vi.fn()
}));
// O mapa (WebGL) e a gestão entram de mentira: o teste é a troca de tela
vi.mock('./components/Map', () => ({ default: () => <div>Mapa da operação</div> }));
vi.mock('./components/management/ManagementPage', () => ({ default: () => <div>Página de gestão</div> }));

beforeEach(() => {
  vi.mocked(getStats).mockResolvedValue({ pendingCalls: 2, awaitingRegulation: 1 });
});

describe('operação e gestão', () => {
  it('Gestão toma a tela; a operação fica por trás, escondida, e volta igual', async () => {
    const user = userEvent.setup();
    renderWithAuth(<App />);
    expect(await screen.findByText('Mapa da operação')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gestão' }));
    expect(await screen.findByText('Página de gestão')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Novo/ })).not.toBeInTheDocument();
    expect(screen.getByText('Mapa da operação')).not.toBeVisible();

    // Chamados esperando regulação ou despacho aparecem no botão de voltar
    await user.click(await screen.findByRole('button', { name: 'Voltar à operação (3 aguardando regulação ou despacho)' }));
    expect(screen.queryByText('Página de gestão')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Novo/ })).toBeVisible();
  });

  it('trocar de aba no meio da ligação não apaga o chamado em preenchimento', async () => {
    const user = userEvent.setup();
    renderWithAuth(<App />);
    await screen.findByText('Mapa da operação');

    await user.click(screen.getByRole('tab', { name: /Novo/ }));
    await user.type(screen.getByLabelText('O que aconteceu'), 'Dor no peito há 20 minutos');
    await user.click(screen.getByRole('tab', { name: /Frota/ }));
    // A aba "Novo" avisa que há um chamado em preenchimento
    expect(screen.getByRole('tab', { name: /Novo.*em preenchimento/ })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Novo/ }));
    expect(screen.getByLabelText('O que aconteceu')).toHaveValue('Dor no peito há 20 minutos');
    expect(screen.getByRole('tab', { name: /Novo/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('atalhos da central', () => {
  const waiting: EmergencyCall = {
    id: 'call-1',
    priority: CallPriority.EMERGENCIA,
    status: CallStatus.AGUARDANDO_REGULACAO,
    timestamp: new Date().toISOString(),
    location: { lat: -23.5, lng: -47.45 },
    address: 'Rua da Penha, 120',
    description: 'Dor no peito',
    patientInfo: { symptoms: '' }
  };

  it('J vai para o chamado, R abre a regulação e, ao voltar, o foco volta ao cartão; N abre o novo', async () => {
    vi.mocked(getPendingCalls).mockResolvedValue([waiting]);
    const user = userEvent.setup();
    renderWithAuth(<App />);
    const card = await screen.findByRole('button', { name: 'Vermelho · Emergência: Rua da Penha, 120' });

    await user.keyboard('j');
    expect(card).toHaveFocus();
    await user.keyboard('r');
    expect(screen.getByRole('heading', { name: 'Regulação' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voltar aos chamados' }));
    expect(screen.getByRole('button', { name: 'Vermelho · Emergência: Rua da Penha, 120' })).toHaveFocus();

    await user.keyboard('n');
    expect(screen.getByRole('tab', { name: /Novo/ })).toHaveAttribute('aria-selected', 'true');
    vi.mocked(getPendingCalls).mockResolvedValue([]);
  });
});
