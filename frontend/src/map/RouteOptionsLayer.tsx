import { useMemo } from 'react';
import { Layer, Source } from '@vis.gl/react-maplibre';
import type { ExpressionSpecification, LineLayerSpecification } from 'maplibre-gl';
import { Coordinates } from '../types';
import { ALT_ROUTE_COLORS, MapTheme, ROUTE_COLORS } from './mapStyle';
import { toLngLat } from './geojson';

// Faixa invisível e larga sobre as rotas: acertar uma linha de 4 px com o mouse é difícil
export const ROUTE_OPTIONS_LAYER = 'route-options-hit';
const HIT_PAINT: LineLayerSpecification['paint'] = { 'line-width': 22, 'line-opacity': 0 };

const SELECTED: ExpressionSpecification = ['==', ['get', 'selected'], true];

/**
 * Rota escolhida em azul por cima e as alternativas em cinza por baixo (como no Waze).
 * Uma fonte só, com `line-sort-key`: a escolhida fica sempre por cima, sem depender da ordem das camadas.
 */
export function RouteOptionsLayer({ routes, selected, theme }: { routes: Coordinates[][]; selected: number; theme: MapTheme }) {
  const data = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: routes.map((line, index) => ({
      type: 'Feature' as const,
      properties: { index, selected: index === selected },
      geometry: { type: 'LineString' as const, coordinates: line.map(toLngLat) }
    }))
  }), [routes, selected]);

  const layout: LineLayerSpecification['layout'] = {
    'line-join': 'round',
    'line-cap': 'round',
    'line-sort-key': ['case', SELECTED, 1, 0]
  };
  const casing = useMemo<LineLayerSpecification['paint']>(() => ({
    'line-color': ['case', SELECTED, ROUTE_COLORS[theme].casing, ALT_ROUTE_COLORS[theme].casing],
    'line-width': ['case', SELECTED, 9, 8]
  }), [theme]);
  const fill = useMemo<LineLayerSpecification['paint']>(() => ({
    'line-color': ['case', SELECTED, ROUTE_COLORS[theme].line, ALT_ROUTE_COLORS[theme].line],
    'line-width': ['case', SELECTED, 5, 4]
  }), [theme]);

  return (
    <Source id="route-options" type="geojson" data={data}>
      <Layer id="route-options-casing" type="line" layout={layout} paint={casing} />
      <Layer id="route-options-line" type="line" layout={layout} paint={fill} />
      <Layer id={ROUTE_OPTIONS_LAYER} type="line" layout={layout} paint={HIT_PAINT} />
    </Source>
  );
}
