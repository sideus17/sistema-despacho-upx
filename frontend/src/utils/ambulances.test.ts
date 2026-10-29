import { describe, expect, it } from 'vitest';
import { STALE_LOCATION_MS, staleLocationText } from './ambulances';

const NOW = Date.parse('2026-10-29T12:00:00Z');
const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const driver = { id: 'motorista-1', name: 'Motorista' };

describe('GPS da viatura', () => {
  it('em turno e sem posição nova há 7 min ou mais, avisa que o GPS parou', () => {
    expect(staleLocationText({ driver, locationUpdatedAt: at(STALE_LOCATION_MS) }, NOW)).toBe('GPS sem atualizar há 7 min');
    expect(staleLocationText({ driver, locationUpdatedAt: at(2 * 3_600_000 + 5 * 60_000) }, NOW)).toBe('GPS sem atualizar há 2 h 05 min');
  });

  it('com posição recente, sem motorista ou ainda sem GPS, não avisa', () => {
    expect(staleLocationText({ driver, locationUpdatedAt: at(5 * 60_000) }, NOW)).toBeNull();
    expect(staleLocationText({ driver: null, locationUpdatedAt: at(60 * 60_000) }, NOW)).toBeNull();
    expect(staleLocationText({ driver, locationUpdatedAt: null }, NOW)).toBeNull();
  });
});
