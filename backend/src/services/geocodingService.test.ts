import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  expandAbbreviations,
  hasHouseNumber,
  houseNumberOf,
  insideServiceArea,
  normalizeCep,
  parsePhotonFeatures,
  parseTomTomGeocode,
  parseViaCep,
  withHouseNumber
} from './geocodingService';

const feature = (properties: Record<string, unknown>, lng = -47.45, lat = -23.5) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties
});

test('abreviações viram a palavra inteira', () => {
  assert.equal(expandAbbreviations('av sao paulo'), 'avenida sao paulo');
  assert.equal(expandAbbreviations('R. XV de Novembro 120'), 'rua XV de Novembro 120');
  assert.equal(expandAbbreviations('  Hospital  Regional '), 'Hospital Regional');
  // "Avenida" já inteira e números não mudam
  assert.equal(expandAbbreviations('Avenida 9 de Julho'), 'Avenida 9 de Julho');
});

test('local com nome: nome em cima, rua, bairro e cidade embaixo', () => {
  const [place] = parsePhotonFeatures({
    features: [feature({
      name: 'Hospital Regional de Sorocaba',
      street: 'Rua Cláudio Manoel da Costa',
      district: 'Vila Boa Vista',
      city: 'Sorocaba',
      osm_key: 'amenity'
    })]
  });
  assert.deepEqual(place, {
    label: 'Hospital Regional de Sorocaba',
    detail: 'Rua Cláudio Manoel da Costa, Vila Boa Vista, Sorocaba',
    location: { lat: -23.5, lng: -47.45 }
  });
});

test('rua: o nome da rua é o título e não se repete embaixo', () => {
  const [street] = parsePhotonFeatures({
    features: [feature({ name: 'Rua Quinze de Novembro', street: 'Rua Quinze de Novembro', district: 'Centro', city: 'Sorocaba', osm_key: 'highway' })]
  });
  assert.equal(street.label, 'Rua Quinze de Novembro');
  assert.equal(street.detail, 'Centro, Sorocaba');
});

test('endereço sem nome usa rua e número; repetidos e sem ponto saem', () => {
  const places = parsePhotonFeatures({
    features: [
      feature({ street: 'Avenida General Carneiro', housenumber: '2000', district: 'Jardim Vera Cruz I', city: 'Sorocaba' }),
      feature({ street: 'Avenida General Carneiro', housenumber: '2000', district: 'Jardim Vera Cruz I', city: 'Sorocaba' }),
      { type: 'Feature', geometry: null, properties: { name: 'Sem ponto' } },
      feature({})
    ]
  });
  assert.equal(places.length, 1);
  assert.equal(places[0].label, 'Avenida General Carneiro, 2000');
  assert.equal(places[0].detail, 'Jardim Vera Cruz I, Sorocaba');
});

test('no máximo 6 sugestões', () => {
  const features = Array.from({ length: 10 }, (_, i) => feature({ name: `Local ${i}`, city: 'Sorocaba' }));
  assert.equal(parsePhotonFeatures({ features }).length, 6);
});

test('número da casa: depois da vírgula ou no fim; o número do nome da rua não conta', () => {
  assert.equal(hasHouseNumber('Rua da Penha, 890'), true);
  assert.equal(hasHouseNumber('Rua XV de Novembro 120'), true);
  assert.equal(hasHouseNumber('Rua 7 de Setembro, 300'), true);
  assert.equal(hasHouseNumber('Av. São Paulo 1200 b'), true);
  assert.equal(hasHouseNumber('Rua 7 de Setembro'), false);
  assert.equal(hasHouseNumber('Hospital Regional'), false);
});

test('CEP com ou sem traço; o resto não é CEP', () => {
  assert.equal(normalizeCep('18010-003'), '18010003');
  assert.equal(normalizeCep(' 18010003 '), '18010003');
  assert.equal(normalizeCep('1801000'), null);
  assert.equal(normalizeCep('Rua 18010'), null);
});

test('ViaCEP: a rua vira sugestão de completar; CEP inexistente ou sem rua não', () => {
  assert.deepEqual(
    parseViaCep({ cep: '18010-003', logradouro: 'Rua da Penha', bairro: 'Centro', localidade: 'Sorocaba', uf: 'SP' }),
    { label: 'Rua da Penha', detail: 'Centro, Sorocaba · CEP 18010-003', fill: 'Rua da Penha, ' }
  );
  assert.equal(parseViaCep({ erro: 'true' }), null);
  assert.equal(parseViaCep({ cep: '18000-000', logradouro: '', localidade: 'Sorocaba' }), null);
});

test('TomTom: endereço com número na região; baixa confiança e outra cidade saem', () => {
  const result = (type: string, score: number, address: Record<string, string>, lat = -23.4993, lon = -47.4579) =>
    ({ type, matchConfidence: { score }, address, position: { lat, lon } });
  const places = parseTomTomGeocode({
    results: [
      result('Point Address', 1, { streetName: 'Rua Maylasky', streetNumber: '54', municipalitySubdivision: 'Centro', municipality: 'Sorocaba' }),
      // Mairinque: fora da região atendida
      result('Address Range', 0.76, { streetName: 'Rua Luiz Matheus Maylasky', streetNumber: '54', municipality: 'Mairinque' }, -23.5452, -47.1843),
      result('Street', 0.41, { streetName: 'Rua 12', municipality: 'Sorocaba' }),
      result('Geography', 1, { municipality: 'Sorocaba' })
    ]
  });
  assert.deepEqual(places, [{ label: 'Rua Maylasky, 54', detail: 'Centro, Sorocaba', location: { lat: -23.4993, lng: -47.4579 } }]);
  // Sem o número na base do TomTom, vem a rua
  const [street] = parseTomTomGeocode({
    results: [result('Street', 0.77, { streetName: 'Avenida Gisele Constantino', municipalitySubdivision: 'Parque Campolim', municipality: 'Sorocaba' })]
  });
  assert.equal(street.street, true);
  assert.deepEqual(parseTomTomGeocode({}), []);
});

test('região atendida: Sorocaba e arredores', () => {
  assert.equal(insideServiceArea({ lat: -23.5015, lng: -47.4526 }), true);
  assert.equal(insideServiceArea({ lat: -23.5452, lng: -47.1843 }), false);
  assert.equal(insideServiceArea({ lat: -23.55, lng: -46.63 }), false);
});

test('o número digitado: depois da vírgula ou no fim', () => {
  assert.equal(houseNumberOf('Rua da Penha, 890'), '890');
  assert.equal(houseNumberOf('Av Gisele Constantino 1850'), '1850');
  assert.equal(houseNumberOf('Av. São Paulo 1200 b'), '1200B');
  assert.equal(houseNumberOf('Rua 7 de Setembro'), null);
});

test('rua sem o número digitado: ganha o número e vira ponto aproximado, depois dos exatos', () => {
  const at = { lat: -23.5, lng: -47.45 };
  const places = withHouseNumber(
    [
      { label: 'Avenida Gisele Constantino', detail: 'Parque Campolim, Sorocaba', location: at, street: true },
      { label: 'Iguatemi Business Esplanada', detail: 'Avenida Gisele Constantino, 1850, Parque Bela Vista', location: at },
      // Mesma rua repetida (TomTom e Photon) e uma rua só parecida
      { label: 'Avenida Gisele Constantino', detail: 'Parque Campolim, Sorocaba', location: at, street: true },
      { label: 'Rua Constantino Senger', detail: 'Sorocaba', location: at, street: true }
    ],
    'Av Gisele Constantino 1850',
    '1850'
  );
  assert.deepEqual(places, [
    { label: 'Iguatemi Business Esplanada', detail: 'Avenida Gisele Constantino, 1850, Parque Bela Vista', location: at },
    { label: 'Rua Constantino Senger', detail: 'Sorocaba', location: at },
    { label: 'Avenida Gisele Constantino, 1850', detail: 'Parque Campolim, Sorocaba', location: at, approximate: true }
  ]);
});
