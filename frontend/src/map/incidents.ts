import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { Incident, IncidentEffect, IncidentSource, IncidentType } from '../types';
import { circlePolygon } from '../crew/navigation/geo';

export const INCIDENT_LABEL: Record<IncidentType, string> = {
  [IncidentType.ALAGAMENTO]: 'Alagamento',
  [IncidentType.QUEDA_ARVORE]: 'Árvore caída',
  [IncidentType.VIA_BLOQUEADA]: 'Via bloqueada',
  [IncidentType.ACIDENTE]: 'Acidente',
  [IncidentType.VENTOS_FORTES]: 'Ventos fortes',
  [IncidentType.CHUVA_FORTE]: 'Chuva forte',
  [IncidentType.ALERTA_OFICIAL]: 'Alerta oficial'
};

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

export interface CentralDefaults {
  effect: IncidentEffect;
  radius: number; // metros
  durationMinutes: number | null; // null = até encerrar
}

// Os mesmos padrões do backend: o formulário da central já vem preenchido pelo tipo
export const CENTRAL_DEFAULTS: Partial<Record<IncidentType, CentralDefaults>> = {
  [IncidentType.ALAGAMENTO]: { effect: IncidentEffect.BLOQUEIO, radius: 200, durationMinutes: 120 },
  [IncidentType.VIA_BLOQUEADA]: { effect: IncidentEffect.BLOQUEIO, radius: 100, durationMinutes: null },
  [IncidentType.QUEDA_ARVORE]: { effect: IncidentEffect.RISCO, radius: 100, durationMinutes: 360 },
  [IncidentType.ACIDENTE]: { effect: IncidentEffect.RISCO, radius: 100, durationMinutes: 60 },
  [IncidentType.VENTOS_FORTES]: { effect: IncidentEffect.AVISO, radius: 500, durationMinutes: 120 },
  [IncidentType.CHUVA_FORTE]: { effect: IncidentEffect.AVISO, radius: 1000, durationMinutes: 120 }
};

export const CENTRAL_TYPES = Object.keys(CENTRAL_DEFAULTS) as IncidentType[];

// Bloqueios primeiro, depois riscos e avisos; dentro de cada um, os mais recentes
export function sortIncidents(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) =>
    EFFECT_META[a.effect].order - EFFECT_META[b.effect].order || Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

// "Equipe USB-01", "Central", "CEMADEN"...
export function sourceLabel(incident: Incident): string {
  if (incident.source === IncidentSource.EQUIPE && incident.ambulance) return `Equipe ${incident.ambulance.code}`;
  return SOURCE_LABEL[incident.source] ?? incident.source;
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
