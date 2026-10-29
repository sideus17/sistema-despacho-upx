import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Incident, IncidentEffect, IncidentSource, IncidentType } from '../../types';
import StillTherePrompt from './StillTherePrompt';

const incident = {
  id: 'oc-1',
  type: IncidentType.ALAGAMENTO,
  effect: IncidentEffect.RISCO,
  source: IncidentSource.EQUIPE,
  location: { lat: -23.5, lng: -47.45 },
  radius: 50,
  createdAt: '2026-10-28T21:00:00Z',
  votes: { yes: 0, no: 0 }
} as unknown as Incident;

describe('"Ainda está lá?" na navegação', () => {
  it('as respostas dizem o que significam: "Ainda está" confirma, "Já saiu" tira', () => {
    const onAnswer = vi.fn();
    render(<StillTherePrompt incident={incident} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ainda está' }));
    expect(onAnswer).toHaveBeenLastCalledWith('SIM');
    fireEvent.click(screen.getByRole('button', { name: 'Já saiu' }));
    expect(onAnswer).toHaveBeenLastCalledWith('NAO');
  });
});
