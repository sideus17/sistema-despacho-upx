import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStats } from './services/api';
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
    expect(screen.queryByRole('button', { name: /Novo/ })).not.toBeInTheDocument();
    expect(screen.getByText('Mapa da operação')).not.toBeVisible();

    // Chamados esperando regulação ou despacho aparecem no botão de voltar
    await user.click(await screen.findByRole('button', { name: 'Voltar à operação (3 aguardando regulação ou despacho)' }));
    expect(screen.queryByText('Página de gestão')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo/ })).toBeVisible();
  });
});
