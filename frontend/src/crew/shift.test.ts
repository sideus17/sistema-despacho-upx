import { describe, expect, it } from 'vitest';
import { Ambulance, AmbulanceStatus, AmbulanceType } from '../types';
import { LOCATION_BUSY_INTERVAL, LOCATION_HEARTBEAT, LOCATION_MIN_INTERVAL, pickerOrder, shouldSendLocation } from './shift';

const BASE = { lat: -23.5015, lng: -47.4526 };

function ambulance(code: string, lat: number, driver: Ambulance['driver'] = null): Ambulance {
  return {
    id: code,
    code,
    type: AmbulanceType.USB,
    status: driver ? AmbulanceStatus.DISPONIVEL : AmbulanceStatus.INDISPONIVEL,
    location: { lat, lng: BASE.lng },
    baseId: 'base-1',
    crew: { driver: '', medic: '' },
    driver,
    locationUpdatedAt: null
  };
}

describe('escolha da viatura no início do turno', () => {
  const longe = ambulance('LONGE', BASE.lat + 0.05);
  const perto = ambulance('PERTO', BASE.lat + 0.0004);
  const ocupada = ambulance('OCUPADA', BASE.lat, { id: 'm1', name: 'Outro Motorista' });

  it('com GPS: livres da mais perto para a mais longe, ocupadas no fim', () => {
    const entries = pickerOrder([longe, ocupada, perto], BASE);
    expect(entries.map(entry => entry.ambulance.code)).toEqual(['PERTO', 'LONGE', 'OCUPADA']);
    expect(entries.map(entry => entry.taken)).toEqual([false, false, true]);
    expect(entries[0].distance).toBeGreaterThan(40);
    expect(entries[0].distance).toBeLessThan(50);
  });

  it('sem GPS: mantém a ordem recebida, ocupadas no fim, sem distância', () => {
    const entries = pickerOrder([longe, ocupada, perto], null);
    expect(entries.map(entry => entry.ambulance.code)).toEqual(['LONGE', 'PERTO', 'OCUPADA']);
    expect(entries.every(entry => entry.distance === null)).toBe(true);
  });
});

describe('posição da viatura durante o turno', () => {
  const now = 1_000_000_000;
  const at = (meters: number) => ({ position: { lat: BASE.lat + meters / 111_320, lng: BASE.lng }, accuracy: 15 });

  it('a primeira leitura boa vai na hora; leitura imprecisa nunca vai', () => {
    expect(shouldSendLocation(null, at(0), now)).toBe(true);
    expect(shouldSendLocation(null, { ...at(0), accuracy: 500 }, now)).toBe(false);
  });

  it('no máximo a cada 30 s, e só se andou mais de 30 m', () => {
    const last = { position: BASE, at: now };
    expect(shouldSendLocation(last, at(200), now + LOCATION_MIN_INTERVAL - 1)).toBe(false);
    expect(shouldSendLocation(last, at(200), now + LOCATION_MIN_INTERVAL)).toBe(true);
    expect(shouldSendLocation(last, at(10), now + LOCATION_MIN_INTERVAL)).toBe(false);
  });

  it('em atendimento, a cada 10 s (a posição marca as etapas)', () => {
    const last = { position: BASE, at: now };
    expect(shouldSendLocation(last, at(200), now + LOCATION_BUSY_INTERVAL - 1, true)).toBe(false);
    expect(shouldSendLocation(last, at(200), now + LOCATION_BUSY_INTERVAL, true)).toBe(true);
    expect(shouldSendLocation(last, at(200), now + LOCATION_BUSY_INTERVAL, false)).toBe(false);
  });

  it('parada, manda de novo a cada 5 min para a central saber que a posição é atual', () => {
    const last = { position: BASE, at: now };
    expect(shouldSendLocation(last, at(5), now + LOCATION_HEARTBEAT - 1)).toBe(false);
    expect(shouldSendLocation(last, at(5), now + LOCATION_HEARTBEAT)).toBe(true);
  });
});
