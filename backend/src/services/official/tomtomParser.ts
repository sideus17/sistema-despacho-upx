import { Coordinates, Incident, IncidentEffect, IncidentSource, IncidentType } from '../../types';
import { cumulativeDistances } from '../geo';

// Incidentes de trânsito do TomTom (Traffic Incident Details v5). Sem Supabase: dá para testar.

// Círculo pequeno no meio do trecho: basta para a rota não passar pela rua, sem pegar as transversais
export const TOMTOM_RADIUS = 25; // metros

// iconCategory do TomTom
const ACCIDENT = 1;
const DANGEROUS_CONDITIONS = 3;
const JAM = 6;
const LANE_CLOSED = 7;
const ROAD_CLOSED = 8;
const ROAD_WORKS = 9;
const FLOODING = 11;
const BROKEN_DOWN_VEHICLE = 14;
const MAJOR_DELAY = 3; // magnitudeOfDelay: trânsito parado

interface TomTomIncident {
  type?: string;
  geometry?: { type?: string; coordinates?: unknown };
  properties?: {
    id?: string;
    iconCategory?: number;
    magnitudeOfDelay?: number;
    events?: Array<{ description?: string }>;
    startTime?: string | null;
    endTime?: string | null;
    from?: string | null;
    to?: string | null;
    probabilityOfOccurrence?: string;
    lastReportTime?: string | null;
  };
}

/**
 * O que cada incidente vira aqui. Interdição "provável" só desvia se custar pouco (muitas vêm de
 * semanas atrás, sem data de fim); congestionamento leve ou moderado fica só na camada de trânsito.
 */
export function tomtomRule(
  category: number | undefined,
  magnitude: number | undefined,
  probability: string | undefined
): { type: IncidentType; effect: IncidentEffect } | null {
  switch (category) {
    case ROAD_CLOSED:
      return {
        type: IncidentType.VIA_BLOQUEADA,
        effect: probability === 'certain' ? IncidentEffect.BLOQUEIO : IncidentEffect.RISCO
      };
    case ACCIDENT:
      return { type: IncidentType.ACIDENTE, effect: IncidentEffect.RISCO };
    case FLOODING:
      return { type: IncidentType.ALAGAMENTO, effect: IncidentEffect.RISCO };
    case JAM:
      return (magnitude ?? 0) >= MAJOR_DELAY ? { type: IncidentType.CONGESTIONAMENTO, effect: IncidentEffect.RISCO } : null;
    case ROAD_WORKS:
    case LANE_CLOSED:
      return { type: IncidentType.OBRAS, effect: IncidentEffect.AVISO };
    case BROKEN_DOWN_VEHICLE:
      return { type: IncidentType.VEICULO_PARADO, effect: IncidentEffect.AVISO };
    case DANGEROUS_CONDITIONS:
      return { type: IncidentType.PERIGO_NA_VIA, effect: IncidentEffect.AVISO };
    default:
      return null;
  }
}

// A API não aceita pt-BR; os textos vêm em pt-PT
const PT_BR: Record<string, string> = {
  'Encerrado/a': 'Via interditada',
  'Trabalhos na estrada': 'Obras na via',
  'Filas de trânsito': 'Trânsito lento',
  'Trânsito parado': 'Trânsito parado',
  'Via fechada': 'Via interditada',
  'Faixa fechada': 'Faixa interditada'
};

function description(properties: NonNullable<TomTomIncident['properties']>): string | null {
  const events = (properties.events ?? [])
    .map(event => event.description?.trim())
    .filter((text): text is string => !!text)
    .map(text => PT_BR[text] ?? text);
  const from = properties.from?.trim();
  const to = properties.to?.trim();
  const where = from && to && from !== to ? `${from} → ${to}` : from || to;
  const text = [events.join('; '), where].filter(Boolean).join(' · ');
  return text || null;
}

function lineFrom(geometry: TomTomIncident['geometry']): Coordinates[] | null {
  const coordinates = geometry?.coordinates;
  if (geometry?.type === 'Point' && Array.isArray(coordinates)) {
    const [lng, lat] = coordinates as number[];
    return Number.isFinite(lat) && Number.isFinite(lng) ? [{ lat, lng }] : null;
  }
  if (geometry?.type !== 'LineString' || !Array.isArray(coordinates)) return null;
  const line = (coordinates as unknown[])
    .filter((point): point is number[] => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    .map(([lng, lat]) => ({ lat, lng }));
  return line.length > 0 ? line : null;
}

// Ponto no meio do trecho (pela distância, não pelo número de pontos)
export function lineMidpoint(line: Coordinates[]): Coordinates {
  if (line.length === 1) return line[0];
  const cumulative = cumulativeDistances(line);
  const half = cumulative[cumulative.length - 1] / 2;
  for (let i = 1; i < line.length; i++) {
    if (cumulative[i] < half) continue;
    const span = cumulative[i] - cumulative[i - 1];
    const t = span > 0 ? (half - cumulative[i - 1]) / span : 0;
    return {
      lat: line[i - 1].lat + (line[i].lat - line[i - 1].lat) * t,
      lng: line[i - 1].lng + (line[i].lng - line[i - 1].lng) * t
    };
  }
  return line[line.length - 1];
}

const validTime = (value: string | null | undefined) => (value && !Number.isNaN(Date.parse(value)) ? value : null);

export function parseTomTomIncidents(body: unknown, now: Date): Incident[] {
  const list = (body as { incidents?: TomTomIncident[] } | null)?.incidents;
  if (!Array.isArray(list)) return [];

  const incidents: Incident[] = [];
  for (const item of list) {
    const properties = item.properties;
    if (!properties?.id) continue;
    const rule = tomtomRule(properties.iconCategory, properties.magnitudeOfDelay, properties.probabilityOfOccurrence);
    const line = lineFrom(item.geometry);
    if (!rule || !line) continue;

    const endTime = validTime(properties.endTime);
    if (endTime && Date.parse(endTime) <= now.getTime()) continue;

    incidents.push({
      id: `tomtom:${properties.id}`,
      type: rule.type,
      source: IncidentSource.TOMTOM,
      effect: rule.effect,
      location: lineMidpoint(line),
      radius: TOMTOM_RADIUS,
      description: description(properties),
      createdAt: validTime(properties.startTime) ?? now.toISOString(),
      expiresAt: endTime,
      lastConfirmedAt: validTime(properties.lastReportTime) ?? now.toISOString(),
      createdBy: null,
      ambulance: null,
      geometry: line.length > 1 ? { type: 'LineString', coordinates: line.map(point => [point.lng, point.lat]) } : null,
      votes: { yes: 0, no: 0 },
      myVote: null
    });
  }
  return incidents;
}
