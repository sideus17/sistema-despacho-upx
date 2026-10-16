import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IncidentEffect, IncidentSource, IncidentType } from '../types';
import { incident } from '../test/incidents';
import Incidents from './Incidents';

vi.mock('../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  getOfficialStatus: vi.fn(() => new Promise(() => {}))
}));

describe('lista de ocorrências da central', () => {
  const equipe = incident({ id: 'eq', type: IncidentType.ALAGAMENTO });
  const interdicao = incident({
    id: 'tomtom:1',
    source: IncidentSource.TOMTOM,
    effect: IncidentEffect.BLOQUEIO,
    radius: 25,
    description: 'Via interditada · Rua A → Rua B'
  });
  const obras = incident({ id: 'tomtom:2', source: IncidentSource.TOMTOM, type: IncidentType.OBRAS, effect: IncidentEffect.AVISO, radius: 25 });

  it('o trânsito do TomTom fica num grupo recolhido, separado das ocorrências das equipes', async () => {
    const user = userEvent.setup();
    render(<Incidents incidents={[interdicao, equipe, obras]} onFocus={vi.fn()} />);

    const main = screen.getAllByRole('list')[0];
    expect(within(main).getAllByRole('listitem')).toHaveLength(1);
    expect(within(main).getByText('Alagamento')).toBeInTheDocument();

    const group = screen.getByText('Trânsito (TomTom) · 2');
    expect(group.closest('details')).not.toHaveAttribute('open');

    await user.click(group);
    expect(screen.getByText('Via interditada · Rua A → Rua B')).toBeVisible();
    // O raio interno do trecho (só para a rota) não aparece
    expect(screen.queryByText(/raio 25 m/)).not.toBeInTheDocument();
  });

  it('sem trânsito informado, o grupo não aparece', () => {
    render(<Incidents incidents={[equipe]} onFocus={vi.fn()} />);
    expect(screen.queryByText(/Trânsito \(TomTom\)/)).not.toBeInTheDocument();
  });
});
