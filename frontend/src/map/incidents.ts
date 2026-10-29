import type { CSSProperties } from 'react';
import type { FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson';
import type { FillLayerSpecification, FilterSpecification, LineLayerSpecification } from 'maplibre-gl';
import { Incident, IncidentEffect, IncidentSource, IncidentType } from '../types';
import { circlePolygon } from '../crew/navigation/geo';
import type { MapTheme } from './mapStyle';

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
  [IncidentSource.DEFESA_CIVIL]: 'Defesa Civil',
  [IncidentSource.TOMTOM]: 'Trânsito ao vivo'
};

// Efeito pela forma, sem as cores da classificação de risco: bloqueio em tinta (marcador quadrado),
// atenção em cinza com contorno sólido e aviso em cinza com contorno tracejado
type EffectTone = 'ink' | 'gray';
export const EFFECT_META: Record<IncidentEffect, { label: string; tone: EffectTone; dashed: boolean; hint: string; order: number }> = {
  [IncidentEffect.BLOQUEIO]: { label: 'Bloqueio', tone: 'ink', dashed: false, hint: 'A rota desvia da área', order: 0 },
  [IncidentEffect.RISCO]: { label: 'Atenção', tone: 'gray', dashed: false, hint: 'A rota evita se houver alternativa', order: 1 },
  [IncidentEffect.AVISO]: { label: 'Aviso', tone: 'gray', dashed: true, hint: 'Só informa, não muda a rota', order: 2 }
};

// Variáveis do CSS do efeito (marcador, selo e ícone): fundo, texto, contorno e traço
export function effectVars(effect: IncidentEffect): CSSProperties {
  const meta = EFFECT_META[effect] ?? EFFECT_META[IncidentEffect.AVISO];
  const ink = meta.tone === 'ink';
  return {
    '--effect-bg': ink ? 'var(--color-primary)' : 'var(--color-surface)',
    '--effect-fg': ink ? 'var(--color-on-primary)' : 'var(--color-text)',
    '--effect-edge': ink ? 'var(--color-primary)' : 'var(--color-text-muted)',
    '--effect-line': meta.dashed ? 'dashed' : 'solid'
  } as CSSProperties;
}

// Cor das áreas no mapa (o MapLibre não lê as variáveis do CSS); o aviso se distingue pelo tracejado
const AREA_COLOR: Record<MapTheme, Record<EffectTone, string>> = {
  day: { ink: '#111827', gray: '#6b7280' },
  night: { ink: '#e5e7eb', gray: '#9ca3af' }
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
  if (incident.expiresAt) return `vale até ${clock(incident.expiresAt)}`;
  return incident.source === IncidentSource.TOMTOM ? 'enquanto aparecer no trânsito ao vivo' : 'até ser encerrada';
}

// Área desenhada no mapa: o contorno da fonte oficial, o trecho de rua do TomTom ou o círculo
export function incidentAreas(incidents: Incident[], theme: MapTheme): FeatureCollection<Polygon | MultiPolygon | LineString> {
  return {
    type: 'FeatureCollection',
    features: incidents
      .filter(incident => incident.geometry || incident.radius > 0)
      .map(incident => ({
        type: 'Feature',
        properties: { effect: incident.effect, color: AREA_COLOR[theme][EFFECT_META[incident.effect].tone] },
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
const NOT_LINE: FilterSpecification = ['!=', ['geometry-type'], 'LineString'];
export const SOLID_OUTLINE_FILTER: FilterSpecification = ['all', NOT_LINE, ['!=', ['get', 'effect'], IncidentEffect.AVISO]];
export const DASHED_OUTLINE_FILTER: FilterSpecification = ['all', NOT_LINE, ['==', ['get', 'effect'], IncidentEffect.AVISO]];

// Trecho de rua (TomTom): linha grossa no tom do efeito; aviso mais claro
export const LINE_FILTER: FilterSpecification = ['==', ['geometry-type'], 'LineString'];
export const INCIDENT_LINE: LineLayerSpecification['paint'] = {
  'line-color': ['get', 'color'],
  'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 14, 4, 17, 8],
  'line-opacity': ['match', ['get', 'effect'], IncidentEffect.AVISO, 0.55, 0.85]
};
export const INCIDENT_LINE_LAYOUT: LineLayerSpecification['layout'] = { 'line-cap': 'round', 'line-join': 'round' };
