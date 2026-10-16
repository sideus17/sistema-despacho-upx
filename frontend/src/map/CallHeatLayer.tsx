import { useMemo } from 'react';
import { Layer, Source, useMap } from '@vis.gl/react-maplibre';
import { CallPriority, HeatPoint } from '../types';
import type { MapTheme } from './mapStyle';
import { HEAT_SOURCE, heatGeoJSON, heatLayer, pointLayer } from './heat';
import { TRAFFIC_BEFORE } from './traffic';

// Calor dos chamados abaixo dos nomes das ruas; os pontos (de perto) por cima de tudo
export function CallHeatLayer({ points, priorities, theme }: { points: HeatPoint[]; priorities: CallPriority[]; theme: MapTheme }) {
  const { current: map } = useMap();
  const data = useMemo(() => heatGeoJSON(points), [points]);
  const beforeId = map?.getLayer(TRAFFIC_BEFORE) ? TRAFFIC_BEFORE : undefined;
  const { source: _heatSource, ...heat } = heatLayer(theme, priorities);
  const { source: _pointSource, ...dots } = pointLayer(theme, priorities);
  return (
    <Source id={HEAT_SOURCE} type="geojson" data={data}>
      <Layer {...heat} beforeId={beforeId} />
      <Layer {...dots} />
    </Source>
  );
}
