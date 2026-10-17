import { describe, expect, it } from 'vitest';
import { CallPriority, HeatPoint } from '../types';
import { HEAT_RAMP, POINT_COLORS, POINTS_FROM_ZOOM, heatGeoJSON, heatLayer, pointLayer } from './heat';

const POINTS: HeatPoint[] = [
  [-23.5063, -47.4403, CallPriority.EMERGENCIA],
  [-23.4308, -47.462, CallPriority.NAO_URGENTE]
];

describe('mapa de calor', () => {
  it('cada chamado vira um ponto [lng, lat] com a cor', () => {
    const data = heatGeoJSON(POINTS);
    expect(data.features).toHaveLength(2);
    expect(data.features[0].geometry.coordinates).toEqual([-47.4403, -23.5063]);
    expect(data.features[1].properties.priority).toBe(CallPriority.NAO_URGENTE);
  });

  it('o filtro de cores vale para o calor e para os pontos', () => {
    const only = [CallPriority.EMERGENCIA];
    const filter = ['in', ['get', 'priority'], ['literal', only]];
    expect(heatLayer('day', only).filter).toEqual(filter);
    expect(pointLayer('night', only).filter).toEqual(filter);
  });

  it('de longe calor; de perto os pontos, com as cores do tema', () => {
    expect(heatLayer('day', []).maxzoom).toBe(POINTS_FROM_ZOOM + 1);
    expect(pointLayer('day', []).minzoom).toBe(POINTS_FROM_ZOOM - 1);
    expect(JSON.stringify(heatLayer('night', []).paint)).toContain(HEAT_RAMP.night[4]);
    const colors = JSON.stringify(pointLayer('night', []).paint?.['circle-color']);
    expect(colors).toContain(POINT_COLORS.night.EMERGENCIA);
    expect(colors).toContain(POINT_COLORS.night.NAO_URGENTE);
  });
});
