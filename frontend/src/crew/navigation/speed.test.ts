import { describe, expect, it } from 'vitest';
import { overLimit, speedLimitAt, toKmh } from './speed';

const SEGMENTS = [
  { from: 0, to: 400, kmh: 60 },
  { from: 400, to: 1000, kmh: 40 },
  { from: 1500, to: 2000, kmh: 70 }
];

describe('limite de velocidade na navegação', () => {
  it('acha o limite do trecho pela distância percorrida', () => {
    expect(speedLimitAt(SEGMENTS, 0)).toBe(60);
    expect(speedLimitAt(SEGMENTS, 400)).toBe(40);
    expect(speedLimitAt(SEGMENTS, 1200)).toBeNull(); // trecho sem limite no mapa
    expect(speedLimitAt(SEGMENTS, 1999)).toBe(70);
    expect(speedLimitAt([], 10)).toBeNull();
  });

  it('converte a velocidade do GPS para km/h', () => {
    expect(toKmh(12.5)).toBe(45);
    expect(toKmh(null)).toBeNull();
    expect(toKmh(-1)).toBeNull();
  });

  it('só acusa excesso acima do limite mais 5 km/h', () => {
    expect(overLimit(65, 60)).toBe(false);
    expect(overLimit(66, 60)).toBe(true);
    expect(overLimit(90, null)).toBe(false);
    expect(overLimit(null, 60)).toBe(false);
  });
});
