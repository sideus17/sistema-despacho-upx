import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CallPriority } from '../types';
import { CallError } from './calls';
import { accentPattern, parseHistoryQuery, parseIncludeDemo, parsePeriod, searchFilter } from './history';

const NOW = Date.parse('2026-10-16T12:00:00.000Z');
const status400 = (error: CallError) => error instanceof CallError && error.status === 400;

test('período: sem nada, os últimos 30 dias; no máximo 1 ano e em ordem', () => {
  assert.deepEqual(parsePeriod({}, NOW), { from: '2026-09-16T12:00:00.000Z', to: '2026-10-16T12:00:00.000Z' });
  assert.deepEqual(parsePeriod({ from: '2026-10-01T03:00:00Z', to: '2026-10-02T03:00:00Z' }, NOW), {
    from: '2026-10-01T03:00:00.000Z',
    to: '2026-10-02T03:00:00.000Z'
  });
  assert.throws(() => parsePeriod({ from: '2026-10-02T00:00:00Z', to: '2026-10-01T00:00:00Z' }, NOW), status400);
  assert.throws(() => parsePeriod({ from: '2024-01-01T00:00:00Z' }, NOW), /1 ano/);
  assert.throws(() => parsePeriod({ from: 'ontem' }, NOW), status400);
});

test('demonstração só entra com demo=true', () => {
  assert.equal(parseIncludeDemo({ demo: 'true' }), true);
  assert.equal(parseIncludeDemo({ demo: 'false' }), false);
  assert.equal(parseIncludeDemo({}), false);
});

test('busca: com ou sem acento, maiúscula ou minúscula', () => {
  assert.equal(accentPattern('Hortência'), 'h[oóôõÓÔÕ]rt[eéêÉÊ]n[cçÇ][iíÍ][aáàâãÁÀÂÃ]');
  assert.equal(accentPattern('hortencia'), accentPattern('HORTÊNCIA'));
  for (const text of ['Vila Hortência', 'Éden', 'Ação']) {
    const [word] = text.split(' ').slice(-1);
    assert.match(text, new RegExp(accentPattern(word.normalize('NFD').replace(/\p{M}/gu, '')), 'i'));
  }
});

test('busca: palavras em qualquer coluna de texto; todas precisam aparecer', () => {
  const eden = accentPattern('eden');
  assert.equal(searchFilter('Éden'), `address.imatch."${eden}",description.imatch."${eden}",reference_point.imatch."${eden}"`);
  const [vila, hortencia] = [accentPattern('vila'), accentPattern('hortencia')];
  assert.equal(
    searchFilter('  vila   hortencia '),
    `and(or(address.imatch."${vila}",description.imatch."${vila}",reference_point.imatch."${vila}"),` +
      `or(address.imatch."${hortencia}",description.imatch."${hortencia}",reference_point.imatch."${hortencia}"))`
  );
  assert.equal(searchFilter(''), null);
  assert.equal(searchFilter(' a '), null);
});

test('busca: telefone com ou sem máscara e id do chamado', () => {
  assert.equal(searchFilter('(15) 99123-4567'), 'caller_phone.like.*15991234567*');
  assert.equal(searchFilter('99123-4567'), 'caller_phone.like.*991234567*');
  assert.equal(searchFilter('demo-lx3k2-12'), 'id.eq.demo-lx3k2-12');
  assert.equal(searchFilter('call-1760600000000'), 'id.eq.call-1760600000000');
  // Número de casa curto é texto
  assert.equal(searchFilter('120'), 'address.imatch."120",description.imatch."120",reference_point.imatch."120"');
});

test('busca: o que o filtro ou a expressão regular interpretariam não passa', () => {
  const filter = searchFilter('a,b) or(id.neq.x "100%" _x\\ .*')!;
  const values = [...filter.matchAll(/imatch\."([^"]*)"/g)].map(match => match[1]);
  assert.deepEqual([...new Set(values)], [accentPattern('or'), accentPattern('id'), accentPattern('neq'), '100']);
  for (const value of values) assert.match(value, /^[\p{L}\p{N}[\]]+$/u);
});

test('histórico: filtros validados e páginas', () => {
  const query = parseHistoryQuery({ priority: 'EMERGENCIA', ambulance: 'amb-1', q: 'Éden', page: '2', demo: 'true' }, NOW);
  assert.equal(query.priority, CallPriority.EMERGENCIA);
  assert.equal(query.ambulanceId, 'amb-1');
  assert.equal(query.includeDemo, true);
  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 25);
  assert.equal(query.status, null);
  assert.equal(query.oldestFirst, false);
  assert.equal(parseHistoryQuery({ order: 'asc' }, NOW).oldestFirst, true);

  assert.throws(() => parseHistoryQuery({ priority: 'ROXO' }, NOW), status400);
  assert.throws(() => parseHistoryQuery({ outcome: 'FUGIU' }, NOW), status400);
  assert.throws(() => parseHistoryQuery({ ambulance: 'amb-1;drop' }, NOW), status400);
  assert.throws(() => parseHistoryQuery({ page: '0' }, NOW), status400);
  assert.throws(() => parseHistoryQuery({ pageSize: '101' }, NOW), status400);
  assert.throws(() => parseHistoryQuery({ order: 'random' }, NOW), status400);
});
