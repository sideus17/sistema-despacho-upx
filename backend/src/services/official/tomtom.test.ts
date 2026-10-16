import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IncidentEffect, IncidentSource, IncidentType } from '../../types';
import { TOMTOM_RADIUS, lineMidpoint, parseTomTomIncidents, tomtomRule } from './tomtomParser';

const NOW = new Date('2026-10-16T12:00:00Z');

// Trecho reto de ~220 m na direção norte, em Sorocaba
const LINE = [[-47.4526, -23.5015], [-47.4526, -23.5005], [-47.4526, -23.4995]];

function incident(properties: Record<string, unknown>, geometry: unknown = { type: 'LineString', coordinates: LINE }) {
  return { type: 'Feature', geometry, properties: { id: 'abc', events: [], ...properties } };
}

test('interdição certa bloqueia; provável só desvia se custar pouco', () => {
  assert.deepEqual(tomtomRule(8, 4, 'certain'), { type: IncidentType.VIA_BLOQUEADA, effect: IncidentEffect.BLOQUEIO });
  assert.deepEqual(tomtomRule(8, 4, 'probable'), { type: IncidentType.VIA_BLOQUEADA, effect: IncidentEffect.RISCO });
  assert.deepEqual(tomtomRule(8, 4, 'risk_of'), { type: IncidentType.VIA_BLOQUEADA, effect: IncidentEffect.RISCO });
});

test('congestionamento só entra quando o trânsito está parado', () => {
  assert.deepEqual(tomtomRule(6, 3, 'certain'), { type: IncidentType.CONGESTIONAMENTO, effect: IncidentEffect.RISCO });
  assert.equal(tomtomRule(6, 2, 'certain'), null);
  assert.equal(tomtomRule(6, 1, 'certain'), null);
});

test('demais categorias: acidente e alagamento são risco; obras, veículo parado e perigo só avisam; clima fica de fora', () => {
  assert.equal(tomtomRule(1, 0, 'certain')?.type, IncidentType.ACIDENTE);
  assert.equal(tomtomRule(11, 0, 'certain')?.effect, IncidentEffect.RISCO);
  assert.deepEqual(tomtomRule(9, 0, 'probable'), { type: IncidentType.OBRAS, effect: IncidentEffect.AVISO });
  assert.deepEqual(tomtomRule(7, 0, 'certain'), { type: IncidentType.OBRAS, effect: IncidentEffect.AVISO });
  assert.equal(tomtomRule(14, 0, 'certain')?.type, IncidentType.VEICULO_PARADO);
  assert.equal(tomtomRule(3, 0, 'certain')?.type, IncidentType.PERIGO_NA_VIA);
  for (const weather of [0, 2, 4, 5, 10, 13]) assert.equal(tomtomRule(weather, 0, 'certain'), null);
});

test('o ponto do meio é pela distância, não pelo número de pontos', () => {
  const middle = lineMidpoint([{ lat: -23.5, lng: -47.45 }, { lat: -23.4999, lng: -47.45 }, { lat: -23.498, lng: -47.45 }]);
  assert.ok(Math.abs(middle.lat - -23.499) < 1e-6);
});

test('converte para ocorrência do TomTom com o trecho, o círculo pequeno no meio e o texto em pt-BR', () => {
  const [parsed] = parseTomTomIncidents({
    incidents: [incident({
      iconCategory: 8,
      magnitudeOfDelay: 4,
      probabilityOfOccurrence: 'certain',
      events: [{ description: 'Encerrado/a' }],
      from: 'Rua A',
      to: 'Rua B',
      startTime: '2026-10-01T10:00:00Z',
      endTime: null
    })]
  }, NOW);

  assert.equal(parsed.id, 'tomtom:abc');
  assert.equal(parsed.source, IncidentSource.TOMTOM);
  assert.equal(parsed.effect, IncidentEffect.BLOQUEIO);
  assert.equal(parsed.radius, TOMTOM_RADIUS);
  assert.ok(Math.abs(parsed.location.lat - -23.5005) < 1e-6);
  assert.equal(parsed.description, 'Via interditada · Rua A → Rua B');
  assert.equal(parsed.createdAt, '2026-10-01T10:00:00Z');
  assert.equal(parsed.expiresAt, null);
  assert.deepEqual(parsed.geometry, { type: 'LineString', coordinates: LINE });
  assert.deepEqual(parsed.votes, { yes: 0, no: 0 });
});

test('ignora o que já acabou, o que não tem geometria e as categorias de fora', () => {
  const parsed = parseTomTomIncidents({
    incidents: [
      incident({ id: 'acabou', iconCategory: 1, endTime: '2026-10-16T11:00:00Z' }),
      incident({ id: 'sem-linha', iconCategory: 1 }, null),
      incident({ id: 'chuva', iconCategory: 4 }),
      incident({ id: 'lento', iconCategory: 6, magnitudeOfDelay: 2 }),
      incident({ id: 'vale', iconCategory: 1, endTime: '2026-10-16T13:00:00Z' })
    ]
  }, NOW);
  assert.deepEqual(parsed.map(item => item.id), ['tomtom:vale']);
  assert.equal(parsed[0].expiresAt, '2026-10-16T13:00:00Z');
});

test('resposta fora do formato não quebra', () => {
  assert.deepEqual(parseTomTomIncidents(null, NOW), []);
  assert.deepEqual(parseTomTomIncidents({ detailedError: { code: 'INVALID_REQUEST' } }, NOW), []);
});
