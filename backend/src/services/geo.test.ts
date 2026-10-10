import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circleEntryAlong, cumulativeDistances, distanceMeters, exclusionPerimeter, exclusionRing, nearCorridor } from './geo';

const LINE = [{ lat: -23.5, lng: -47.47 }, { lat: -23.5, lng: -47.45 }];
const CUMULATIVE = cumulativeDistances(LINE);

test('entrada da rota no círculo', () => {
  const along = circleEntryAlong(LINE, CUMULATIVE, { lat: -23.5, lng: -47.46 }, 100);
  assert.ok(along !== null && Math.abs(along - (CUMULATIVE[1] / 2 - 100)) < 5, `along=${along}`);
});

test('círculo fora da rota não conta', () => {
  assert.equal(circleEntryAlong(LINE, CUMULATIVE, { lat: -23.49, lng: -47.46 }, 100), null);
});

test('polígono de exclusão envolve o círculo', () => {
  const center = { lat: -23.5, lng: -47.46 };
  const ring = exclusionRing(center, 100);
  assert.equal(ring.length, 17);
  for (const [lng, lat] of ring) assert.ok(distanceMeters(center, { lat, lng }) >= 100);
  assert.ok(exclusionPerimeter(100) > 2 * Math.PI * 100 && exclusionPerimeter(100) < 2 * Math.PI * 100 * 1.02);
});

test('corredor da viagem', () => {
  assert.ok(nearCorridor(LINE[0], LINE[1], { lat: -23.51, lng: -47.46 }, 100, 2000));
  assert.ok(!nearCorridor(LINE[0], LINE[1], { lat: -23.6, lng: -47.46 }, 100, 2000));
});
