import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ambulance, AmbulanceStatus, AmbulanceType, CallPriority, CallStatus, EmergencyCall } from '../types';
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
  sessionStorage.clear();
});

afterEach(() => vi.useRealTimers());

type Props = { calls: EmergencyCall[] | null; ambulances?: Ambulance[] };

function setup(initial: EmergencyCall[] | null, own: string[] = [], ambulances: Ambulance[] = []) {
  const toast = vi.fn();
  const ownKeys = { current: new Set(own) };
  const ownFreed = { current: new Set<string>() };
  const view = renderHook(
    ({ calls, ambulances = [] }: Props) => useCallAlerts(calls, ownKeys, toast, ambulances, ownFreed),
    { initialProps: { calls: initial, ambulances } as Props }
  );
  return { ...view, toast, ownKeys, ownFreed };
}

const ambulance = (id: string, status: AmbulanceStatus): Ambulance => ({
  id, code: id.toUpperCase(), type: AmbulanceType.USA, status, location: { lat: -23.5, lng: -47.45 }, baseId: 'base-1',
  crew: { driver: '', medic: '' }, driver: { id: `motorista-${id}`, name: 'Motorista' }, locationUpdatedAt: null
});

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

  it('antes da primeira carga não compara: os chamados que já estavam na fila não viram "Novo chamado"', () => {
    const { rerender, toast } = setup(null);
    rerender({ calls: [call('a'), call('b')] });
    expect(toast).not.toHaveBeenCalled();
    expect(playAlert).not.toHaveBeenCalled();

    rerender({ calls: [call('a'), call('b'), call('c')] });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('Novo chamado: Amarelo · Rua c, 1', 'info');
  });

  it('numa recarga, só avisa o que chegou no meio-tempo, e a espera longa não toca de novo', () => {
    const first = setup([call('a'), call('velho', 4)]);
    expect(playAlert).toHaveBeenCalledWith('espera');
    first.unmount();
    vi.mocked(playAlert).mockReset();

    const { toast } = setup([call('a'), call('velho', 4), call('b')]);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('Novo chamado: Amarelo · Rua b, 1', 'info');
    expect(playAlert).toHaveBeenCalledWith('novo');
    expect(playAlert).not.toHaveBeenCalledWith('espera');
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

  it('espera de 3 min na regulação toca uma vez por chamado, sem aviso por cima do mapa', () => {
    const { toast } = setup([call('velho', 2)]);
    expect(playAlert).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(65_000));
    expect(playAlert).toHaveBeenCalledWith('espera');
    // O resumo fica na própria fila (lateSummary), não num aviso de erro
    expect(toast).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(60_000));
    expect(playAlert).toHaveBeenCalledTimes(1);
  });

  it('no despacho, a espera conta da regulação e avisa com 5 min', () => {
    // Aberto há 10 min, regulado há 4: ainda não
    const { toast, rerender } = setup([{ ...regulated('b', 4), timestamp: new Date(NOW - 10 * 60_000).toISOString() }]);
    expect(toast).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(65_000));
    rerender({ calls: [{ ...regulated('b', 4), timestamp: new Date(NOW - 10 * 60_000).toISOString() }], ambulances: [] });
    expect(playAlert).toHaveBeenCalledWith('espera');
    expect(toast).not.toHaveBeenCalled();
  });

  it('viatura que fica livre com chamado esperando despacho avisa e toca', () => {
    const waiting = [regulated('b')];
    const { rerender, toast } = setup(waiting, ['PENDENTE:b'], [ambulance('amb-1', AmbulanceStatus.EM_ATENDIMENTO)]);
    expect(toast).not.toHaveBeenCalled();

    rerender({ calls: waiting, ambulances: [ambulance('amb-1', AmbulanceStatus.DISPONIVEL)] });
    expect(toast).toHaveBeenCalledWith('AMB-1 ficou livre: 1 chamado esperando despacho', 'info');
    expect(playAlert).toHaveBeenCalledWith('novo');
  });

  it('viatura livre sem chamado esperando, ou liberada por esta tela, não avisa', () => {
    const { rerender, toast, ownFreed } = setup([], [], [ambulance('amb-1', AmbulanceStatus.EM_ATENDIMENTO)]);
    rerender({ calls: [], ambulances: [ambulance('amb-1', AmbulanceStatus.DISPONIVEL)] });
    expect(toast).not.toHaveBeenCalled();

    // Esta tela finalizou o atendimento: quem finalizou já sabe que ela ficou livre
    const waiting = [regulated('b')];
    rerender({ calls: waiting, ambulances: [ambulance('amb-1', AmbulanceStatus.EM_ATENDIMENTO)] });
    ownFreed.current.add('amb-1');
    rerender({ calls: waiting, ambulances: [ambulance('amb-1', AmbulanceStatus.DISPONIVEL)] });
    expect(toast).not.toHaveBeenCalledWith(expect.stringContaining('ficou livre'), 'info');
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
