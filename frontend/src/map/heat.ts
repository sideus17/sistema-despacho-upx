import type { CircleLayerSpecification, ExpressionSpecification, FilterSpecification, HeatmapLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { CallPriority, HeatPoint } from '../types';
import { PRIORITIES_BY_SEVERITY, PRIORITY_META } from '../utils/calls';
import type { MapTheme } from './mapStyle';

// Mapa de calor dos chamados (gestão): a densidade num tom só; de perto, cada chamado com a sua cor

export const HEAT_SOURCE = 'call-heat';
export const HEAT_LAYER = 'call-heat';
export const HEAT_POINTS_LAYER = 'call-heat-points';
// A partir deste zoom o calor some e ficam os pontos
export const POINTS_FROM_ZOOM = 14;

// Violeta: não se confunde com as 4 cores da classificação. No claro, mais escuro onde há mais
// chamados; no escuro, mais claro
export const HEAT_RAMP: Record<MapTheme, string[]> = {
  day: ['rgba(221, 214, 254, 0)', '#ddd6fe', '#a78bfa', '#7c3aed', '#4c1d95'],
  night: ['rgba(91, 33, 182, 0)', '#5b21b6', '#7c3aed', '#a78bfa', '#ede9fe']
};

// A cor da pulseira de cada classificação, como nos gráficos (o MapLibre não lê as variáveis do CSS)
const pointColors = (theme: MapTheme) =>
  Object.fromEntries(PRIORITIES_BY_SEVERITY.map(priority => [priority, PRIORITY_META[priority].edge[theme]])) as Record<CallPriority, string>;
export const POINT_COLORS: Record<MapTheme, Record<CallPriority, string>> = { day: pointColors('day'), night: pointColors('night') };

// Anel da cor do fundo em volta de cada ponto, para os vizinhos não se misturarem
const RING: Record<MapTheme, string> = { day: '#ffffff', night: '#1f2937' };

export function heatGeoJSON(points: HeatPoint[]): FeatureCollection<Point, { priority: CallPriority }> {
  return {
    type: 'FeatureCollection',
    features: points.map(([lat, lng, priority]) => ({
      type: 'Feature',
      properties: { priority },
      geometry: { type: 'Point', coordinates: [lng, lat] }
    }))
  };
}

export const priorityFilter = (priorities: CallPriority[]): FilterSpecification =>
  ['in', ['get', 'priority'], ['literal', priorities]];

export function heatLayer(theme: MapTheme, priorities: CallPriority[]): HeatmapLayerSpecification {
  const ramp = HEAT_RAMP[theme];
  return {
    id: HEAT_LAYER,
    type: 'heatmap',
    source: HEAT_SOURCE,
    maxzoom: POINTS_FROM_ZOOM + 1,
    filter: priorityFilter(priorities),
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 15, 2],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 13, 30, 15, 40],
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, ramp[0], 0.2, ramp[1], 0.45, ramp[2], 0.7, ramp[3], 1, ramp[4]],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], POINTS_FROM_ZOOM - 1, 0.85, POINTS_FROM_ZOOM + 1, 0]
    }
  };
}

export function pointLayer(theme: MapTheme, priorities: CallPriority[]): CircleLayerSpecification {
  const colors = POINT_COLORS[theme];
  const fadeIn: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], POINTS_FROM_ZOOM - 1, 0, POINTS_FROM_ZOOM, 1];
  return {
    id: HEAT_POINTS_LAYER,
    type: 'circle',
    source: HEAT_SOURCE,
    minzoom: POINTS_FROM_ZOOM - 1,
    filter: priorityFilter(priorities),
    paint: {
      'circle-color': [
        'match',
        ['get', 'priority'],
        CallPriority.EMERGENCIA, colors.EMERGENCIA,
        CallPriority.URGENTE, colors.URGENTE,
        CallPriority.PRIORITARIO, colors.PRIORITARIO,
        colors.NAO_URGENTE
      ],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], POINTS_FROM_ZOOM - 1, 3, 17, 7],
      'circle-stroke-width': 2,
      'circle-stroke-color': RING[theme],
      'circle-opacity': fadeIn,
      'circle-stroke-opacity': fadeIn
    }
  };
}
