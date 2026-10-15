import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry } from './capParser';
import { heavyRainSectors } from './rainRule';

const entry = (area: string, extra = '') => `<entry><content type="text/xml"><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>123/2026</identifier><sent>2026-10-09T10:00:00-03:00</sent><status>Actual</status><msgType>Update</msgType>
  ${extra}
  <info><event>CHUVAS INTENSAS</event><expires>2026-10-10T10:00:00-03:00</expires>
  <headline>Defesa Civil: chuva forte &amp; ventos</headline>${area}</info></alert></content>`;

test('alerta CAP pelo código IBGE de Sorocaba', () => {
  const alert = parseEntry(entry('<area><areaDesc>X</areaDesc><geocode><valueName>IBGE</valueName><value>3552205</value></geocode></area>'));
  assert.equal(alert?.coversSorocaba, true);
  assert.equal(alert?.headline, 'Defesa Civil: chuva forte & ventos');
});

test('alerta CAP pelo polígono (lat,lon) que cobre a cidade', () => {
  const polygon = '-23.3,-47.6 -23.3,-47.3 -23.7,-47.3 -23.7,-47.6 -23.3,-47.6';
  assert.equal(parseEntry(entry(`<area><polygon>${polygon}</polygon></area>`))?.coversSorocaba, true);
});

test('alerta CAP de outra cidade não vale', () => {
  const polygon = '-15.0,-56.3 -15.0,-56.2 -15.1,-56.2 -15.1,-56.3 -15.0,-56.3';
  const alert = parseEntry(entry(`<area><polygon>${polygon}</polygon><geocode><valueName>IBGE</valueName><value>5100102</value></geocode></area>`));
  assert.equal(alert?.coversSorocaba, false);
});

test('alerta CAP de atualização aponta o anterior', () => {
  const alert = parseEntry(entry('', '<references>CENAD-SEDEC,100/2026,2026-10-09T09:00:00-03:00 CENAD-SEDEC,101/2026,2026-10-09T09:30:00-03:00</references>'));
  assert.deepEqual(alert?.references, ['100/2026', '101/2026']);
});

const NOW = Date.parse('2026-10-10T01:00:00Z');
const reading = (codestacao: string, acc1hr: number, acc3hr: number, datahora = '2026-10-10T00:50:00') => ({ codestacao, acc1hr, acc3hr, datahora });

test('chuva forte perto de setor de inundação aciona o setor', () => {
  // Jardim Saira fica perto dos setores 001 e 002 (Vila Rica/Além Ponte e Jd. Piratininga)
  const alerts = heavyRainSectors([reading('355220510A', 35, 40)], NOW);
  const ids = alerts.map(alert => alert.sector.id);
  assert.ok(ids.includes('SP_SOROCAB_SR_001_CPRM') && ids.includes('SP_SOROCAB_SR_002_CPRM'), ids.join(','));
  assert.match(alerts[0].description, /35 mm em 1 h na estação Jardim Saira/);
});

test('chuva fraca ou leitura antiga não aciona', () => {
  assert.deepEqual(heavyRainSectors([reading('355220510A', 10, 20)], NOW), []);
  assert.deepEqual(heavyRainSectors([reading('355220510A', 80, 90, '2026-10-09T20:00:00')], NOW), []);
});

test('acumulado de 3 h também aciona', () => {
  assert.ok(heavyRainSectors([reading('355220510A', 5, 55)], NOW).length > 0);
});
