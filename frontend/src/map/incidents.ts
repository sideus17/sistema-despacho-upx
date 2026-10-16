import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { FillLayerSpecification, FilterSpecification, LineLayerSpecification } from 'maplibre-gl';
import { Incident, IncidentEffect, IncidentSource, IncidentType } from '../types';
import { circlePolygon } from '../crew/navigation/geo';

export const INCIDENT_LABEL: Record<IncidentType, string> = {
  [IncidentType.ALAGAMENTO]: 'Alagamento',
  [IncidentType.QUEDA_ARVORE]: 'Árvore caída',
  [IncidentType.VIA_BLOQUEADA]: 'Via bloqueada',
  [IncidentType.ACIDENTE]: 'Acidente',
  [IncidentType.VENTOS_FORTES]: 'Ventos fortes',
  [IncidentType.CHUVA_FORTE]: 'Chuva forte',
  [IncidentType.ALERTA_OFICIAL]: 'Alerta oficial',
  [IncidentType.OBRAS]: 'Obras',
  [IncidentType.CONGESTIONAMENTO]: 'Congestionamento',
  [IncidentType.PERIGO_NA_VIA]: 'Perigo na pista',
  [IncidentType.VEICULO_PARADO]: 'Veículo parado',
  [IncidentType.SEMAFORO_QUEBRADO]: 'Semáforo quebrado'
};

// Nome do tipo, mesmo que o backend mande um tipo que esta versão do app ainda não conhece
export function incidentTypeLabel(type: IncidentType): string {
  return INCIDENT_LABEL[type] ?? 'Ocorrência';
}

export const SOURCE_LABEL: Record<IncidentSource, string> = {
  [IncidentSource.CENTRAL]: 'Central',
  [IncidentSource.EQUIPE]: 'Equipe',
  [IncidentSource.CEMADEN]: 'CEMADEN',
  [IncidentSource.DEFESA_CIVIL]: 'Defesa Civil'
};

export const EFFECT_META: Record<IncidentEffect, { label: string; color: string; hint: string; order: number }> = {
  [IncidentEffect.BLOQUEIO]: { label: 'Bloqueio', color: '#dc2626', hint: 'A rota desvia da área', order: 0 },
  [IncidentEffect.RISCO]: { label: 'Risco', color: '#f59e0b', hint: 'A rota evita se houver alternativa', order: 1 },
  [IncidentEffect.AVISO]: { label: 'Aviso', color: '#8b5cf6', hint: 'Só informa, não muda a rota', order: 2 }
};

// Bloqueios primeiro, depois riscos e avisos; dentro de cada um, os mais recentes
export function sortIncidents(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) =>
    EFFECT_META[a.effect].order - EFFECT_META[b.effect].order || Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

type Described = Pick<Incident, 'type' | 'source' | 'ambulance'>;

// "Equipe USB-01", "Central", "CEMADEN"...
export function sourceLabel(incident: Pick<Incident, 'source' | 'ambulance'>): string {
  if (incident.source === IncidentSource.EQUIPE && incident.ambulance) return `Equipe ${incident.ambulance.code}`;
  return SOURCE_LABEL[incident.source] ?? incident.source;
}

// "Alagamento (Equipe USB-01)"
export function incidentName(incident: Described): string {
  return `${incidentTypeLabel(incident.type)} (${sourceLabel(incident)})`;
}

function clock(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
}

export function expiryLabel(incident: Incident): string {
  return incident.expiresAt ? `vale até ${clock(incident.expiresAt)}` : 'até a central encerrar';
}

// Área desenhada no mapa: o contorno da fonte oficial, quando existe, ou o círculo
export function incidentAreas(incidents: Incident[]): FeatureCollection<Polygon | MultiPolygon> {
  return {
    type: 'FeatureCollection',
    features: incidents
      .filter(incident => incident.geometry || incident.radius > 0)
      .map(incident => ({
        type: 'Feature',
        properties: { effect: incident.effect, color: EFFECT_META[incident.effect].color },
        geometry: incident.geometry ?? { type: 'Polygon', coordinates: [circlePolygon(incident.location, incident.radius)] }
      }))
  };
}

// Pintura das áreas (central, prévia e navegação usam a mesma)
export const INCIDENT_FILL: FillLayerSpecification['paint'] = {
  'fill-color': ['get', 'color'],
  'fill-opacity': ['match', ['get', 'effect'], IncidentEffect.BLOQUEIO, 0.24, IncidentEffect.RISCO, 0.16, 0.08]
};
export const INCIDENT_OUTLINE: LineLayerSpecification['paint'] = { 'line-color': ['get', 'color'], 'line-width': 2 };
// Aviso: contorno tracejado, porque não mexe na rota
export const INCIDENT_OUTLINE_DASHED: LineLayerSpecification['paint'] = { ...INCIDENT_OUTLINE, 'line-dasharray': [2, 2] };
export const SOLID_OUTLINE_FILTER: FilterSpecification = ['!=', ['get', 'effect'], IncidentEffect.AVISO];
export const DASHED_OUTLINE_FILTER: FilterSpecification = ['==', ['get', 'effect'], IncidentEffect.AVISO];
