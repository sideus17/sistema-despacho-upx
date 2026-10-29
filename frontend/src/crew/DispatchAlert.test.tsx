import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playAlert } from '../utils/alertSound';
import { CallPriority, CallStatus, EmergencyCall } from '../types';
import DispatchAlert, { ALARM_INTERVAL_MS } from './DispatchAlert';

vi.mock('../utils/alertSound', () => ({ playAlert: vi.fn() }));

const call: EmergencyCall = {
  id: 'call-1',
  priority: CallPriority.URGENTE,
  timestamp: '2026-10-28T21:40:00Z',
  location: { lat: -23.5, lng: -47.45 },
  address: 'Rua Barão do Rio Branco, 200 - Centro',
  reference: 'em frente à padaria',
  status: CallStatus.EM_ATENDIMENTO,
  description: 'queda',
  patientInfo: { symptoms: 'queda' },
  triage: { signals: ['TRAUMA'], suggested: CallPriority.URGENTE }
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(playAlert).mockClear();
});
afterEach(() => vi.useRealTimers());

describe('alarme do despacho no app da equipe', () => {
  it('mostra a cor numa faixa, o endereço e a referência em tela cheia', () => {
    render(<DispatchAlert call={call} onAck={vi.fn()} />);
    // A cor vem junto do título: é a primeira coisa que o leitor de tela fala
    expect(screen.getByRole('alertdialog', { name: 'Novo despacho Amarelo · Urgência' })).toBeInTheDocument();
    expect(screen.getByText('Rua Barão do Rio Branco, 200 - Centro')).toBeInTheDocument();
    expect(screen.getByText('Referência: em frente à padaria')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ciente' })).toHaveFocus();
  });

  it('toca na hora e repete até o "Ciente"; depois para', () => {
    const onAck = vi.fn();
    const { unmount } = render(<DispatchAlert call={call} onAck={onAck} />);
    expect(playAlert).toHaveBeenCalledTimes(1);
    expect(playAlert).toHaveBeenLastCalledWith('despacho');

    act(() => vi.advanceTimersByTime(ALARM_INTERVAL_MS * 2));
    expect(playAlert).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole('button', { name: 'Ciente' }));
    expect(onAck).toHaveBeenCalledTimes(1);

    // Quem mostra o alarme tira da tela depois do "Ciente"
    unmount();
    act(() => vi.advanceTimersByTime(ALARM_INTERVAL_MS * 3));
    expect(playAlert).toHaveBeenCalledTimes(3);
  });
});
