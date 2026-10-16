import axios from 'axios';
import { Incident } from '../../types';
import { parseTomTomIncidents } from './tomtomParser';

// Incidentes de trânsito do TomTom: ficam só na memória (mudam a cada minuto e o TomTom é a fonte da verdade)

export const tomtomConfigured = () => !!process.env.TOMTOM_API_KEY;
export const tomtomUrl = () => process.env.TOMTOM_URL || 'https://api.tomtom.com';

// Região de Sorocaba (oeste, sul, leste, norte)
const BBOX = '-47.56,-23.58,-47.36,-23.40';
const FIELDS = '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,' +
  'events{description},startTime,endTime,from,to,probabilityOfOccurrence,lastReportTime}}}';
// Leitura velha demais (fonte com erro há tempo) não vale mais
const STALE_AFTER = 30 * 60_000;

let snapshot: { at: number; incidents: Incident[] } | null = null;

export async function refreshTomTom(): Promise<{ total: number; kept: number }> {
  let body: unknown;
  try {
    const response = await axios.get(`${tomtomUrl()}/traffic/services/5/incidentDetails`, {
      params: { key: process.env.TOMTOM_API_KEY, bbox: BBOX, fields: FIELDS, language: 'pt-PT', timeValidityFilter: 'present' },
      timeout: 10000
    });
    body = response.data;
  } catch (error) {
    // A mensagem não pode levar a URL: ela tem a chave
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    throw new Error(status ? `TomTom respondeu ${status}` : 'TomTom não respondeu');
  }

  const incidents = parseTomTomIncidents(body, new Date());
  snapshot = { at: Date.now(), incidents };
  const total = (body as { incidents?: unknown[] })?.incidents?.length ?? 0;
  return { total, kept: incidents.length };
}

export function tomtomActiveIncidents(now = Date.now()): Incident[] {
  if (!snapshot || now - snapshot.at > STALE_AFTER) return [];
  return snapshot.incidents.filter(incident => !incident.expiresAt || Date.parse(incident.expiresAt) > now);
}
