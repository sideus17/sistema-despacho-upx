import { Layer, Source, useMap } from '@vis.gl/react-maplibre';
import { trafficTileUrl } from '../services/api';
import type { MapTheme } from './mapStyle';
import { TRAFFIC_BEFORE, TRAFFIC_SOURCE, trafficLayer, useTrafficVersion } from './traffic';

// Linhas de lentidão (TomTom) na central e na prévia da equipe
export function TrafficLayer({ theme }: { theme: MapTheme }) {
  const version = useTrafficVersion();
  const { current: map } = useMap();

  // Sem a camada de referência (estilo diferente), vai por cima das ruas mesmo assim
  const beforeId = map?.getLayer(TRAFFIC_BEFORE) ? TRAFFIC_BEFORE : undefined;
  const { source: _source, ...layer } = trafficLayer(theme);
  return (
    <Source id={TRAFFIC_SOURCE} type="vector" tiles={[trafficTileUrl(version)]} minzoom={10} maxzoom={16}>
      <Layer {...layer} beforeId={beforeId} />
    </Source>
  );
}
