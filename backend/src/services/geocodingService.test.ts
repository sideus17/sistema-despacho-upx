import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandAbbreviations, parsePhotonFeatures } from './geocodingService';

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
