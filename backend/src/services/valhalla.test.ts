import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedLimitSegments } from './valhalla';

test('arestas viram trechos com limite, juntando vizinhas com o mesmo valor', () => {
  const segments = speedLimitSegments([
    { length: 0.1, speed_limit: 40 },
    { length: 0.05, speed_limit: 40 },
    { length: 0.2, speed_limit: 60 },
    { length: 0.1, speed_limit: null }, // sem limite no mapa: sem placa
    { length: 0.1, speed_limit: 'unlimited' },
    { length: 0.3, speed_limit: 60 }
  ]);
  assert.deepEqual(segments, [
    { from: 0, to: 150, kmh: 40 },
    { from: 150, to: 350, kmh: 60 },
    { from: 550, to: 850, kmh: 60 }
  ]);
});

test('rota sem nenhum limite conhecido não tem trechos', () => {
  assert.deepEqual(speedLimitSegments([{ length: 1, speed_limit: null }, {}]), []);
});
