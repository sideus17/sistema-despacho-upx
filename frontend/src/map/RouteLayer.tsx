import { useMemo } from 'react';
import { Layer, Source } from '@vis.gl/react-maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';
import { Coordinates } from '../types';
import { MapTheme, ROUTE_COLORS } from './mapStyle';
import { lineFeature } from './geojson';

const LAYOUT: LineLayerSpecification['layout'] = { 'line-join': 'round', 'line-cap': 'round' };

// Rota azul com contorno, igual à da navegação do motorista
export function RouteLayer({ line, theme }: { line: Coordinates[]; theme: MapTheme }) {
  const data = useMemo(() => lineFeature(line), [line]);
  const casing = useMemo(() => ({ 'line-color': ROUTE_COLORS[theme].casing, 'line-width': 9 }), [theme]);
  const fill = useMemo(() => ({ 'line-color': ROUTE_COLORS[theme].line, 'line-width': 5 }), [theme]);

  return (
    <Source id="route" type="geojson" data={data}>
      <Layer id="route-casing" type="line" layout={LAYOUT} paint={casing} />
      <Layer id="route-line" type="line" layout={LAYOUT} paint={fill} />
    </Source>
  );
}
