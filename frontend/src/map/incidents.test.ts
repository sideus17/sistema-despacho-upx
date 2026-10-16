import { describe, expect, it } from 'vitest';
import { IncidentSource } from '../types';
import { incident } from '../test/incidents';
import { expiryLabel, incidentAreas, sourceLabel } from './incidents';

const TRECHO = { type: 'LineString' as const, coordinates: [[-47.4526, -23.5015], [-47.4526, -23.4995]] };

describe('ocorrências no mapa', () => {
  it('trecho de rua do TomTom vai como linha; as outras como área', () => {
    const areas = incidentAreas([
      incident({ id: 'tt', source: IncidentSource.TOMTOM, radius: 25, geometry: TRECHO }),
      incident({ id: 'eq' })
    ]);
    expect(areas.features.map(feature => feature.geometry.type)).toEqual(['LineString', 'Polygon']);
    expect(areas.features[0].geometry).toEqual(TRECHO);
  });

  it('o TomTom sem fim previsto vale enquanto ele informar, e não "até a central encerrar"', () => {
    const tomtom = incident({ source: IncidentSource.TOMTOM });
    expect(expiryLabel(tomtom)).toBe('enquanto o TomTom informar');
    expect(sourceLabel(tomtom)).toBe('TomTom');
    expect(expiryLabel(incident())).toBe('até a central encerrar');
  });
});
