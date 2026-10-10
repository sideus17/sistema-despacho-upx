import { useMemo } from 'react';
import { Layer, Marker, Source } from '@vis.gl/react-maplibre';
import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';
import { Incident, IncidentEffect } from '../types';
import { incidentAreas } from './incidents';
import { IncidentMarker } from './Markers';

const FILL: FillLayerSpecification['paint'] = {
  'fill-color': ['get', 'color'],
  'fill-opacity': ['match', ['get', 'effect'], IncidentEffect.BLOQUEIO, 0.24, IncidentEffect.RISCO, 0.16, 0.08]
};
const OUTLINE: LineLayerSpecification['paint'] = { 'line-color': ['get', 'color'], 'line-width': 2 };
// Aviso: contorno tracejado, porque não mexe na rota
const OUTLINE_DASHED: LineLayerSpecification['paint'] = { ...OUTLINE, 'line-dasharray': [2, 2] };

interface IncidentLayerProps {
  incidents: Incident[];
  // Camada a partir da qual as áreas ficam por baixo (ex.: a rota)
  beforeId?: string;
  onSelect?: (incident: Incident, event: { originalEvent: MouseEvent }) => void;
}

// Áreas e marcadores das ocorrências; a mesma camada na central e no app da equipe
export function IncidentLayer({ incidents, beforeId, onSelect }: IncidentLayerProps) {
  const areas = useMemo(() => incidentAreas(incidents), [incidents]);

  return (
    <>
      <Source id="incident-areas" type="geojson" data={areas}>
        <Layer id="incident-fill" type="fill" paint={FILL} beforeId={beforeId} />
        <Layer
          id="incident-outline"
          type="line"
          filter={['!=', ['get', 'effect'], IncidentEffect.AVISO]}
          paint={OUTLINE}
          beforeId={beforeId}
        />
        <Layer
          id="incident-outline-dashed"
          type="line"
          filter={['==', ['get', 'effect'], IncidentEffect.AVISO]}
          paint={OUTLINE_DASHED}
          beforeId={beforeId}
        />
      </Source>

      {incidents
        .filter(incident => incident.radius > 0 || incident.geometry)
        .map(incident => (
          <Marker
            key={incident.id}
            longitude={incident.location.lng}
            latitude={incident.location.lat}
            onClick={onSelect ? event => onSelect(incident, event) : undefined}
          >
            <IncidentMarker type={incident.type} effect={incident.effect} />
          </Marker>
        ))}
    </>
  );
}
