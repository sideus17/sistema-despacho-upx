import { describe, expect, it } from 'vitest';
import { RouteInfo } from '../types';
import { fastestIndex, normalizeText, routeOptions, routeVia, trafficNote } from './routes';

const route = (duration: number, steps: [string, number][] = []): RouteInfo => ({
  distance: 1000,
  duration,
  geometry: [],
  steps: steps.map(([name, distance]) => ({ type: 'continue', name, distance, duration: 0, location: { lat: 0, lng: 0 } })),
  waypoints: [],
  engine: 'valhalla',
  incidentsOnRoute: [],
  avoided: [],
  warnings: []
});

describe('rotas do painel', () => {
  it('principal primeiro, depois as alternativas', () => {
    const main = { ...route(600), alternatives: [route(500), route(700)] };
    expect(routeOptions(main).map(r => r.duration)).toEqual([600, 500, 700]);
    expect(routeOptions(null)).toEqual([]);
  });

  it('a mais rápida ganha o selo', () => {
    expect(fastestIndex([route(600), route(500), route(700)])).toBe(1);
    expect(fastestIndex([route(600)])).toBe(0);
  });

  it('"via" é a rua em que a rota anda mais, somando os trechos', () => {
    const r = route(600, [['Rua A', 300], ['Avenida São Paulo', 500], ['Rua A', 400], ['', 900]]);
    expect(routeVia(r)).toBe('Rua A');
    expect(routeVia(route(600))).toBeNull();
  });

  it('busca ignora acento e maiúscula', () => {
    expect(normalizeText('  São Paulo ')).toBe('sao paulo');
  });
});

describe('atraso do trânsito', () => {
  it('aparece a partir de 1 minuto, arredondado', () => {
    expect(trafficNote({ ...route(600), trafficDelay: 250 })).toBe('+4 min de trânsito');
    expect(trafficNote({ ...route(600), trafficDelay: 20 })).toBeNull();
    expect(trafficNote(route(600))).toBeNull();
  });
});
