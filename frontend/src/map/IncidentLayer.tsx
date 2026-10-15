import { useMemo } from 'react';
import { Layer, Marker, Source } from '@vis.gl/react-maplibre';
import { Incident } from '../types';
import {
  DASHED_OUTLINE_FILTER,
  INCIDENT_FILL,
  INCIDENT_OUTLINE,
  INCIDENT_OUTLINE_DASHED,
  SOLID_OUTLINE_FILTER,
  incidentAreas
} from './incidents';
import { IncidentMarker } from './Markers';

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
        <Layer id="incident-fill" type="fill" paint={INCIDENT_FILL} beforeId={beforeId} />
        <Layer
          id="incident-outline"
          type="line"
          filter={SOLID_OUTLINE_FILTER}
          paint={INCIDENT_OUTLINE}
          beforeId={beforeId}
        />
        <Layer
          id="incident-outline-dashed"
          type="line"
          filter={DASHED_OUTLINE_FILTER}
          paint={INCIDENT_OUTLINE_DASHED}
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
