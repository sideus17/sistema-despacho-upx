import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STALE_LOCATION_MS } from '../utils/ambulances';
import { useShiftLocation } from './useShiftLocation';

vi.mock('../services/api', () => ({ updateAmbulanceLocation: vi.fn(async () => {}) }));

type Success = (position: { coords: { latitude: number; longitude: number; accuracy: number; speed: number | null } }) => void;
type Failure = (error: { code: number; PERMISSION_DENIED: number }) => void;
let onSuccess: Success;
let onError: Failure;

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: (success: Success, error: Failure) => {
        onSuccess = success;
        onError = error;
        return 1;
      },
      clearWatch: vi.fn()
    }
  });
});

afterEach(() => vi.useRealTimers());

const fix = () => onSuccess({ coords: { latitude: -23.5, longitude: -47.45, accuracy: 10, speed: 0 } });

describe('GPS do turno', () => {
  it('sem permissão, avisa na hora; com leitura nova, o aviso some', () => {
    const { result } = renderHook(() => useShiftLocation('amb-1', true));
    expect(result.current.problem).toBeNull();

    act(() => onError({ code: 1, PERMISSION_DENIED: 1 }));
    expect(result.current.problem).toBe('negado');

    act(() => fix());
    expect(result.current.problem).toBeNull();
  });

  it('sem leitura há 7 min, avisa que está sem sinal, desde a última leitura boa', () => {
    const { result } = renderHook(() => useShiftLocation('amb-1', true));
    act(() => fix());
    const lastFix = result.current.since;

    act(() => vi.advanceTimersByTime(STALE_LOCATION_MS + 30_000));
    expect(result.current.problem).toBe('sem-sinal');
    expect(result.current.hadFix).toBe(true);
    expect(result.current.since).toBe(lastFix);
  });

  it('na navegação (desligado), não avisa nada', () => {
    const { result } = renderHook(() => useShiftLocation('amb-1', false));
    act(() => vi.advanceTimersByTime(STALE_LOCATION_MS * 2));
    expect(result.current.problem).toBeNull();
  });
});
