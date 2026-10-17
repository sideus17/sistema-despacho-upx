import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ambulance, CallPriority, CallStatus, Hospital } from '../../types';
import { getHistory } from '../../services/api';
import { historyCall } from '../../test/management';
import History from './History';

vi.mock('../../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../../services/api')>()),
  getHistory: vi.fn()
}));

const SCOPE = { from: '2026-09-17T03:00:00.000Z', to: '2026-10-16T15:00:00.000Z', demo: true };
const AMBULANCES = [{ id: 'amb-3', code: 'USB-02' } as Ambulance];
const HOSPITALS = [{ id: 'hosp-santa-casa', name: 'Santa Casa de Misericórdia de Sorocaba', shortName: 'Santa Casa' } as Hospital];

beforeEach(() => {
  vi.mocked(getHistory).mockReset();
  vi.mocked(getHistory).mockImplementation(async (_scope, _filters, page) => ({
    items: [historyCall({ id: `demo-${page}` })],
    total: 60,
    page,
    pageSize: 25
  }));
});

const renderHistory = () => render(<History scope={SCOPE} ambulances={AMBULANCES} hospitals={HOSPITALS} />);

describe('histórico', () => {
  it('tabela com abertura, viatura, hospital, desfecho e os tempos', async () => {
    renderHistory();
    const row = (await screen.findByRole('button', { name: 'Vila Hortência, Sorocaba/SP' })).closest('tr')!;
    expect(row).toHaveTextContent('USB-02');
    expect(row).toHaveTextContent('Santa Casa');
    expect(row).toHaveTextContent('Levado ao hospital');
    expect(row).toHaveTextContent('15,0 min'); // resposta: 13:43 → 13:58
    expect(row).toHaveTextContent('54,0 min'); // total: 13:43 → 14:37
    expect(row).toHaveTextContent('Demonstração');
    expect(screen.getByText('1–25 de 60 chamados')).toBeInTheDocument();
  });

  it('páginas: a próxima pede a página 2; filtro novo volta para a 1', async () => {
    const user = userEvent.setup();
    renderHistory();
    await screen.findByText('1–25 de 60 chamados');
    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(await screen.findByText('26–50 de 60 chamados')).toBeInTheDocument();
    expect(getHistory).toHaveBeenLastCalledWith(SCOPE, {}, 2, expect.any(AbortSignal));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Cor' }), CallPriority.EMERGENCIA);
    expect(await screen.findByText('1–25 de 60 chamados')).toBeInTheDocument();
    expect(getHistory).toHaveBeenLastCalledWith(SCOPE, { priority: CallPriority.EMERGENCIA }, 1, expect.any(AbortSignal));
  });

  it('a busca espera parar de digitar e vai junto com os filtros', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHistory();
    await screen.findByText('1–25 de 60 chamados');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), CallStatus.CANCELADO);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar no histórico' }), 'hortencia');
    const calls = vi.mocked(getHistory).mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(vi.mocked(getHistory).mock.calls.length).toBe(calls + 1);
    expect(getHistory).toHaveBeenLastCalledWith(SCOPE, { status: CallStatus.CANCELADO, q: 'hortencia' }, 1, expect.any(AbortSignal));

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(getHistory).toHaveBeenLastCalledWith(SCOPE, {}, 1, expect.any(AbortSignal));
  });

  it('detalhe do chamado com a linha do tempo; Esc fecha', async () => {
    const user = userEvent.setup();
    renderHistory();
    await user.click(await screen.findByRole('button', { name: 'Vila Hortência, Sorocaba/SP' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Santa Casa de Misericórdia de Sorocaba');
    const steps = within(dialog).getAllByRole('listitem').map(item => item.textContent);
    expect(steps[0]).toContain('Abertura do chamado');
    expect(steps[3]).toMatch(/Chegada ao local\+15,0 min/);
    expect(steps).toHaveLength(7);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sem resultado com filtro avisa', async () => {
    vi.mocked(getHistory).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    const user = userEvent.setup();
    renderHistory();
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Viatura' }), 'amb-3');
    expect(await screen.findByText('Nenhum chamado com esses filtros.')).toBeInTheDocument();
  });
});
