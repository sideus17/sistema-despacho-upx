import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CallPriority, CallStatus, EmergencyCall } from '../types';
import { playAlert } from '../utils/alertSound';
import { useCallAlerts } from './useCallAlerts';

vi.mock('../utils/alertSound', () => ({ playAlert: vi.fn(), unlockAlertSound: vi.fn() }));

const NOW = new Date('2026-10-16T12:00:00Z').getTime();

const call = (id: string, minutesAgo = 0, status = CallStatus.AGUARDANDO_REGULACAO): EmergencyCall => ({
  id,
  priority: CallPriority.URGENTE,
  status,
  timestamp: new Date(NOW - minutesAgo * 60_000).toISOString(),
  location: { lat: -23.5, lng: -47.45 },
  address: `Rua ${id}, 1`,
  description: '',
  patientInfo: { symptoms: '' }
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.mocked(playAlert).mockReset();
});

afterEach(() => vi.useRealTimers());

function setup(initial: EmergencyCall[], own: string[] = []) {
  const toast = vi.fn();
  const ownKeys = { current: new Set(own) };
  const view = renderHook(({ calls }) => useCallAlerts(calls, ownKeys, toast), { initialProps: { calls: initial } });
  return { ...view, toast, ownKeys };
}

// Chamado regulado: espera a viatura desde a regulação
const regulated = (id: string, minutesAgo = 0): EmergencyCall => ({
  ...call(id, minutesAgo + 1, CallStatus.PENDENTE),
  times: { regulated: new Date(NOW - minutesAgo * 60_000).toISOString() }
});

describe('alertas da central', () => {
  it('o que já estava na fila ao abrir não é novidade; chamado novo de outro atendente avisa e toca', () => {
    const { rerender, toast } = setup([call('a')]);
    expect(toast).not.toHaveBeenCalled();

    rerender({ calls: [call('a'), call('b')] });
    expect(toast).toHaveBeenCalledWith('Novo chamado: Amarelo · Rua b, 1', 'info');
    expect(playAlert).toHaveBeenCalledWith('novo');
  });

  it('chamado aberto ou regulado nesta tela não alerta', () => {
    const { rerender, toast } = setup([], ['AGUARDANDO_REGULACAO:meu', 'PENDENTE:meu']);
    rerender({ calls: [call('meu')] });
    rerender({ calls: [regulated('meu')] });
    expect(toast).not.toHaveBeenCalled();
    expect(playAlert).not.toHaveBeenCalled();
  });

  it('chamado regulado por outro atendente avisa quem despacha', () => {
    const { rerender, toast } = setup([call('a')]);
    rerender({ calls: [regulated('a')] });
    expect(toast).toHaveBeenCalledWith('Chamado regulado, aguardando despacho: Amarelo · Rua a, 1', 'info');
    expect(playAlert).toHaveBeenCalledWith('novo');
  });

  it('espera de 3 min na regulação avisa uma vez por chamado', () => {
    const { toast } = setup([call('velho', 2)]);
    expect(toast).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(65_000));
    expect(toast).toHaveBeenCalledWith('Chamado aguardando regulação há 3 min ou mais: Amarelo · Rua velho, 1', 'error');
    expect(playAlert).toHaveBeenCalledWith('espera');

    act(() => vi.advanceTimersByTime(60_000));
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('no despacho, a espera conta da regulação e avisa com 5 min', () => {
    // Aberto há 10 min, regulado há 4: ainda não
    const { toast, rerender } = setup([{ ...regulated('b', 4), timestamp: new Date(NOW - 10 * 60_000).toISOString() }]);
    expect(toast).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(65_000));
    rerender({ calls: [{ ...regulated('b', 4), timestamp: new Date(NOW - 10 * 60_000).toISOString() }] });
    expect(toast).toHaveBeenCalledWith('Chamado aguardando despacho há 5 min ou mais: Amarelo · Rua b, 1', 'error');
  });

  it('com os alertas desligados, o aviso na tela continua, mas sem som', async () => {
    const { setCallAlertsEnabled } = await import('./useCallAlerts');
    act(() => setCallAlertsEnabled(false));
    const { rerender, toast } = setup([]);
    rerender({ calls: [call('c')] });
    expect(toast).toHaveBeenCalled();
    expect(playAlert).not.toHaveBeenCalled();
    act(() => setCallAlertsEnabled(true));
  });
});
