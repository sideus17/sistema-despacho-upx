import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RouteInfo } from '../types';
import { applyTrafficTimes, supportingPoints } from './tomtomRouting';
import { createBudget } from './official/tomtomBudget';

function route(duration: number, name: string): RouteInfo {
  return {
    distance: 1000,
    duration,
    geometry: [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.01 }],
    steps: [{ name } as RouteInfo['steps'][number]],
    engine: 'valhalla',
    incidentsOnRoute: [],
    avoided: [],
    warnings: []
  };
}

test('pontos de apoio: no máximo 150, espalhados, com o primeiro e o último', () => {
  const line = Array.from({ length: 1000 }, (_, i) => ({ lat: i, lng: 0 }));
  const points = supportingPoints(line);
  assert.equal(points.length, 150);
  assert.equal(points[0].lat, 0);
  assert.equal(points[149].lat, 999);
  assert.deepEqual(supportingPoints(line.slice(0, 10)), line.slice(0, 10));
});

test('com trânsito, o tempo é o do TomTom e a mais rápida passa a ser a principal', () => {
  const main = { ...route(600, 'principal'), alternatives: [route(700, 'alternativa 1'), route(650, 'alternativa 2')] };
  const result = applyTrafficTimes(main, [{ duration: 900, delay: 300 }, { duration: 720, delay: 20 }, null]);

  assert.equal(result.steps[0].name, 'alternativa 2');
  assert.equal(result.duration, 650);
  assert.equal(result.durationSource, 'ESTIMATIVA');
  assert.deepEqual(result.alternatives?.map(option => [option.steps[0].name, option.duration, option.trafficDelay]), [
    ['alternativa 1', 720, 20],
    ['principal', 900, 300]
  ]);
  assert.ok(result.alternatives?.every(option => option.alternatives === undefined));
});

test('sem alternativas pedidas, a resposta continua sem a lista; sem TomTom, vale a estimativa', () => {
  const single = applyTrafficTimes(route(600, 'única'), [{ duration: 480, delay: 0 }]);
  assert.equal(single.duration, 480);
  assert.equal(single.durationSource, 'TRANSITO');
  assert.equal('alternatives' in single, false);

  const estimate = applyTrafficTimes(route(600, 'única'), [null]);
  assert.equal(estimate.duration, 600);
  assert.equal(estimate.durationSource, 'ESTIMATIVA');
});

test('teto diário: o tempo de rota para em 90%, os incidentes vão até o fim, e zera no dia seguinte', () => {
  let now = new Date('2026-10-16T10:00:00Z');
  const budget = createBudget(() => ({ request: 10, tile: 2 }), () => now);

  for (let i = 0; i < 9; i++) assert.equal(budget.spend('request', true), true);
  assert.equal(budget.spend('request', true), false);
  assert.equal(budget.spend('request'), true);
  assert.equal(budget.spend('request'), false);

  assert.equal(budget.spend('tile'), true);
  assert.equal(budget.spend('tile'), true);
  assert.equal(budget.spend('tile'), false);
  assert.deepEqual(budget.usage(), { requests: 10, tiles: 2, requestLimit: 10, tileLimit: 2 });

  now = new Date('2026-10-17T00:00:01Z');
  assert.equal(budget.spend('request', true), true);
  assert.deepEqual(budget.usage(), { requests: 1, tiles: 0, requestLimit: 10, tileLimit: 2 });
});
