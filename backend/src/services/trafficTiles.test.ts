import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trafficTileAllowed } from './trafficTiles';

// Bloco do centro de Sorocaba (-23.5015, -47.4526) no zoom 14
const CENTER_Z14 = { x: 6032, y: 9292 };

test('serve os blocos de Sorocaba entre os zooms 10 e 16', () => {
  assert.equal(trafficTileAllowed(14, CENTER_Z14.x, CENTER_Z14.y), true);
  assert.equal(trafficTileAllowed(16, CENTER_Z14.x * 4 + 1, CENTER_Z14.y * 4 + 2), true);
  assert.equal(trafficTileAllowed(10, 377, 580), true);
});

test('recusa zoom fora da faixa, outras cidades e números quebrados', () => {
  assert.equal(trafficTileAllowed(9, 188, 290), false);
  assert.equal(trafficTileAllowed(17, CENTER_Z14.x * 8, CENTER_Z14.y * 8), false);
  // São Paulo, no zoom 14
  assert.equal(trafficTileAllowed(14, 6069, 9295), false);
  assert.equal(trafficTileAllowed(14, CENTER_Z14.x + 0.5, CENTER_Z14.y), false);
  assert.equal(trafficTileAllowed(Number.NaN, CENTER_Z14.x, CENTER_Z14.y), false);
});
