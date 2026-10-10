import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Coordinates, Incident, IncidentEffect, IncidentSource, IncidentType } from '../types';
import { EngineRoute } from './osrm';
import { NoRouteError } from './valhalla';
import { routeAvoiding } from './avoidance';

// Trajeto leste-oeste de ~2 km em Sorocaba, com desvios ao norte e ao sul
const FROM = { lat: -23.5, lng: -47.47 };
const TO = { lat: -23.5, lng: -47.45 };
const route = (points: [number, number][], duration: number): EngineRoute => ({
  distance: 0,
  duration,
  geometry: points.map(([lat, lng]) => ({ lat, lng })),
  steps: []
});
const DIRECT = route([[-23.5, -47.47], [-23.5, -47.46], [-23.5, -47.45]], 300);
const NORTH = route([[-23.5, -47.47], [-23.49, -47.465], [-23.49, -47.455], [-23.5, -47.45]], 360);
const SOUTH = route([[-23.5, -47.47], [-23.51, -47.465], [-23.51, -47.455], [-23.5, -47.45]], 380);

let seq = 0;
function incident(effect: IncidentEffect, location: Coordinates, radius = 100): Incident {
  return {
    id: `i${++seq}`,
    type: IncidentType.ALAGAMENTO,
    source: IncidentSource.CENTRAL,
    effect,
    location,
    radius,
    description: null,
    createdAt: '',
    expiresAt: null,
    lastConfirmedAt: null,
    createdBy: null,
    ambulance: null,
    geometry: null,
    votes: { yes: 0, no: 0 },
    myVote: null
  };
}

// Motor falso: escolhe o caminho conforme as áreas evitadas
function engine(pick: (excluded: Incident[]) => EngineRoute | 'sem-caminho') {
  const calls: string[][] = [];
  const fn = async (excluded: Incident[]) => {
    calls.push(excluded.map(i => i.id));
    const result = pick(excluded);
    if (result === 'sem-caminho') throw new NoRouteError('sem caminho');
    return result;
  };
  return { fn, calls };
}

const OPTIONS = { maxPerimeter: 9500 };

test('bloqueio no caminho: a rota desvia', async () => {
  const block = incident(IncidentEffect.BLOQUEIO, { lat: -23.5, lng: -47.46 });
  const { fn, calls } = engine(excluded => (excluded.includes(block) ? NORTH : DIRECT));
  const result = await routeAvoiding(FROM, TO, [block], fn, OPTIONS);
  assert.equal(result.route, NORTH);
  assert.deepEqual(result.avoided, [block]);
  assert.deepEqual(calls, [[], [block.id]]);
  assert.deepEqual(result.warnings, []);
});

test('bloqueio no desvio também: segunda rodada evita os dois', async () => {
  const block = incident(IncidentEffect.BLOQUEIO, { lat: -23.5, lng: -47.46 });
  const onNorth = incident(IncidentEffect.BLOQUEIO, { lat: -23.49, lng: -47.46 });
  const { fn, calls } = engine(excluded => (excluded.includes(onNorth) ? SOUTH : excluded.includes(block) ? NORTH : DIRECT));
  const result = await routeAvoiding(FROM, TO, [block, onNorth], fn, OPTIONS);
  assert.equal(result.route, SOUTH);
  assert.deepEqual(result.avoided.map(i => i.id).sort(), [block.id, onNorth.id].sort());
  assert.equal(calls.length, 3);
});

test('sem caminho sem passar pelo bloqueio: segue a rota e avisa', async () => {
  const block = incident(IncidentEffect.BLOQUEIO, { lat: -23.5, lng: -47.46 });
  const { fn } = engine(excluded => (excluded.length ? 'sem-caminho' : DIRECT));
  const result = await routeAvoiding(FROM, TO, [block], fn, OPTIONS);
  assert.equal(result.route, DIRECT);
  assert.deepEqual(result.avoided, []);
  assert.match(result.warnings[0], /Não há caminho sem passar por Alagamento \(Central\)/);
});

test('risco com desvio barato: desvia', async () => {
  const risk = incident(IncidentEffect.RISCO, { lat: -23.5, lng: -47.46 });
  const { fn } = engine(excluded => (excluded.includes(risk) ? NORTH : DIRECT)); // +60 s
  const result = await routeAvoiding(FROM, TO, [risk], fn, OPTIONS);
  assert.equal(result.route, NORTH);
  assert.deepEqual(result.avoided, [risk]);
});

test('risco com desvio caro: passa pela área', async () => {
  const risk = incident(IncidentEffect.RISCO, { lat: -23.5, lng: -47.46 });
  const slow = { ...NORTH, duration: 300 + 200 };
  const { fn } = engine(excluded => (excluded.includes(risk) ? slow : DIRECT));
  const result = await routeAvoiding(FROM, TO, [risk], fn, OPTIONS);
  assert.equal(result.route, DIRECT);
  assert.deepEqual(result.avoided, []);
});

test('destino dentro do bloqueio: não tenta desviar e avisa', async () => {
  const block = incident(IncidentEffect.BLOQUEIO, TO, 150);
  const { fn, calls } = engine(() => DIRECT);
  const result = await routeAvoiding(FROM, TO, [block], fn, OPTIONS);
  assert.deepEqual(calls, [[]]);
  assert.match(result.warnings[0], /O destino fica na área de Alagamento/);
});

test('aviso não muda a rota', async () => {
  const notice = incident(IncidentEffect.AVISO, { lat: -23.5, lng: -47.46 }, 500);
  const { fn, calls } = engine(() => DIRECT);
  const result = await routeAvoiding(FROM, TO, [notice], fn, OPTIONS);
  assert.deepEqual(calls, [[]]);
  assert.deepEqual(result.avoided, []);
});

test('área maior que o limite do servidor: avisa em vez de pedir', async () => {
  const huge = incident(IncidentEffect.BLOQUEIO, { lat: -23.5, lng: -47.46 }, 2000);
  const { fn, calls } = engine(() => DIRECT);
  const result = await routeAvoiding({ lat: -23.5, lng: -47.5 }, { lat: -23.5, lng: -47.42 }, [huge], fn, OPTIONS);
  assert.deepEqual(calls, [[]]);
  assert.match(result.warnings[0], /Áreas bloqueadas demais/);
});
