import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOsrmRoutes } from './osrm';

// Rota no formato do OSRM (o Valhalla responde igual com format: 'osrm')
const route = (distance: number, street: string) => ({
  distance,
  duration: distance / 10,
  geometry: { coordinates: [[-47.45, -23.5], [-47.44, -23.49]] },
  legs: [{
    steps: [
      { maneuver: { type: 'depart', location: [-47.45, -23.5] }, name: street, distance, duration: distance / 10 },
      { maneuver: { type: 'arrive', location: [-47.44, -23.49] }, name: '', distance: 0, duration: 0 }
    ]
  }]
});

test('a primeira rota é a principal e as outras viram alternativas', () => {
  const parsed = parseOsrmRoutes([route(8200, 'Avenida São Paulo'), route(6200, 'Rua XV'), route(8300, 'Avenida Ipanema')]);
  assert.equal(parsed.distance, 8200);
  assert.equal(parsed.steps[0].name, 'Avenida São Paulo');
  assert.deepEqual(parsed.alternatives?.map(alt => alt.distance), [6200, 8300]);
  assert.deepEqual(parsed.geometry[1], { lng: -47.44, lat: -23.49 });
});

test('sem alternativas, a rota vem sem o campo', () => {
  const parsed = parseOsrmRoutes([route(5000, 'Rua A')]);
  assert.equal(parsed.alternatives, undefined);
});
