import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IncidentType } from '../../types';
import { incidentTypeLabel } from '../../map/incidents';
import { renderWithAuth } from '../../test/renderWithAuth';
import ReportSheet from './ReportSheet';
import { submitReport } from './reportQueue';

vi.mock('./reportQueue', () => ({ submitReport: vi.fn() }));

const POSITION = { lat: -23.5015, lng: -47.4526 };

describe('folha de relato da equipe', () => {
  it('folha modal: o foco entra nela e o Esc fecha', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithAuth(<ReportSheet getPosition={async () => POSITION} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Relatar ocorrência' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog', { name: 'Relatar ocorrência' })).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('oferece os 9 tipos, inclusive os novos do modelo Waze', () => {
    renderWithAuth(<ReportSheet getPosition={async () => POSITION} onClose={vi.fn()} />);
    const names = screen.getAllByRole('button').map(button => button.textContent?.replace(/­/g, ''));
    expect(names).toEqual([
      'Acidente',
      'Congestionamento',
      'Via bloqueada',
      'Alagamento',
      'Árvore caída',
      'Obras',
      'Veículo parado',
      'Perigo na pista',
      'Semáforo quebrado',
      'Cancelar'
    ]);
  });

  it('um toque relata no ponto do GPS e fecha a folha', async () => {
    vi.mocked(submitReport).mockResolvedValue({
      status: 'sent',
      result: { incident: {} as never, created: true, merged: false }
    });
    const onClose = vi.fn();
    const speak = vi.fn();
    renderWithAuth(<ReportSheet getPosition={async () => POSITION} onClose={onClose} speak={speak} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Obras' }));

    expect(submitReport).toHaveBeenCalledWith(IncidentType.OBRAS, POSITION);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(speak).toHaveBeenCalledWith('Obras relatado');
  });
});

describe('nome do tipo de ocorrência', () => {
  it('tipo que esta versão do app ainda não conhece não quebra a tela', () => {
    expect(incidentTypeLabel(IncidentType.SEMAFORO_QUEBRADO)).toBe('Semáforo quebrado');
    expect(incidentTypeLabel('TIPO_FUTURO' as IncidentType)).toBe('Ocorrência');
  });
});
