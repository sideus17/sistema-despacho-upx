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
    ], 'day');
    expect(areas.features.map(feature => feature.geometry.type)).toEqual(['LineString', 'Polygon']);
    expect(areas.features[0].geometry).toEqual(TRECHO);
  });

  it('o TomTom sem fim previsto vale enquanto ele informar; a central não encerra ocorrências', () => {
    const tomtom = incident({ source: IncidentSource.TOMTOM });
    expect(expiryLabel(tomtom)).toBe('enquanto aparecer no trânsito ao vivo');
    expect(sourceLabel(tomtom)).toBe('Trânsito ao vivo');
    expect(expiryLabel(incident())).toBe('até ser encerrada');
  });
});
