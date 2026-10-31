import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPeople } from '../../services/api';
import { PeopleIndicators } from '../../types';
import People from './People';

vi.mock('../../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../../services/api')>()),
  getPeople: vi.fn()
}));

const SCOPE = { from: '2026-09-17T03:00:00.000Z', to: '2026-10-16T15:00:00.000Z', demo: true };
const stats = (n: number, median: number | null) => ({ n, median, p90: median });

const DATA: PeopleIndicators = {
  period: { from: SCOPE.from, to: SCOPE.to },
  includeDemo: true,
  truncated: false,
  unattributed: 12,
  attendants: [
    {
      id: 'u-1', name: 'Ana Ribeiro', demo: true, opened: 40, regulated: 35, dispatched: 30,
      closedWithoutDispatch: 4, reclassified: 3, regulation: stats(35, 90), dispatch: stats(30, 150)
    },
    {
      id: 'u-2', name: 'Bruno Souza', demo: false, opened: 2, regulated: 0, dispatched: 0,
      closedWithoutDispatch: 0, reclassified: 0, regulation: stats(0, null), dispatch: stats(0, null)
    }
  ],
  drivers: [{ id: 'u-3', name: 'Igor Matos', demo: true, attended: 18, departure: stats(17, 60), arrival: stats(18, 540) }]
};

beforeEach(() => {
  vi.mocked(getPeople).mockReset();
  vi.mocked(getPeople).mockResolvedValue(DATA);
});

describe('indicadores por pessoa', () => {
  it('tabela dos atendentes: contagens e medianas; sem dados, traço', async () => {
    render(<People scope={SCOPE} />);
    const card = await screen.findByRole('region', { name: 'Atendentes' });
    const [ana, bruno] = within(card).getAllByRole('row').slice(1);
    expect([...ana.querySelectorAll('th, td')].map(cell => cell.textContent)).toEqual([
      'Ana RibeiroDemonstração', '40', '35', '30', '4', '3', '1,5 min', '2,5 min'
    ]);
    expect(within(bruno).getAllByRole('cell').slice(-2).map(cell => cell.textContent)).toEqual(['—', '—']);
    expect(getPeople).toHaveBeenCalledWith(SCOPE, expect.any(AbortSignal));
  });

  it('ordena pelo cabeçalho: menor primeiro, de novo inverte; sem casos sempre por último', async () => {
    const user = userEvent.setup();
    vi.mocked(getPeople).mockResolvedValue({
      ...DATA,
      attendants: [
        ...DATA.attendants,
        { ...DATA.attendants[0], id: 'u-4', name: 'Érica Lima', demo: false, regulation: stats(5, 60) }
      ]
    });
    render(<People scope={SCOPE} />);
    const card = await screen.findByRole('region', { name: 'Atendentes' });
    const names = () => within(card).getAllByRole('row').slice(1).map(row => within(row).getByRole('rowheader').textContent);
    const header = within(card).getByRole('columnheader', { name: /^Regulação/ });
    expect(header).not.toHaveAttribute('aria-sort');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['Érica Lima', 'Ana RibeiroDemonstração', 'Bruno Souza']);

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(names()).toEqual(['Ana RibeiroDemonstração', 'Érica Lima', 'Bruno Souza']);

    // Nome em ordem alfabética do português (É junto do E)
    await user.click(within(card).getByRole('button', { name: /^Atendente/ }));
    expect(names()).toEqual(['Ana RibeiroDemonstração', 'Bruno Souza', 'Érica Lima']);
  });

  it('motoristas e o aviso dos chamados sem autor', async () => {
    render(<People scope={SCOPE} />);
    const card = await screen.findByRole('region', { name: 'Motoristas' });
    expect(within(card).getByRole('row', { name: /Igor Matos/ })).toHaveTextContent('181,0 min9,0 min');
    expect(screen.getByRole('note')).toHaveTextContent('12 chamados do período são de antes do registro');
  });

  it('período sem ninguém', async () => {
    vi.mocked(getPeople).mockResolvedValue({ ...DATA, attendants: [], drivers: [], unattributed: 0 });
    render(<People scope={{ ...SCOPE, demo: false }} />);
    expect(await screen.findByText('Ninguém registrou chamados neste período.')).toBeInTheDocument();
    expect(screen.getByText(/Incluir demonstração/)).toBeInTheDocument();
  });
});
