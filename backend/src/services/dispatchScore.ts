import {
  AmbulanceStatus,
  AmbulanceType,
  CallPriority,
  Coordinates,
  DispatchScore,
  Incident,
  IncidentEffect,
  IncidentSource,
  RouteInfo
} from '../types';
import { distanceMeters } from './geo';

// Nota do despacho: quem chega antes (com o trânsito de agora) pesa mais. Sem Supabase: dá para testar.

export const WEIGHTS = {
  TIME: 0.4,
  AVAILABILITY: 0.3,
  TYPE: 0.2,
  INCIDENTS: 0.1
};

// Até 3 min vale tudo; aos 25 min, nada
const FULL_SCORE_SECONDS = 3 * 60;
const ZERO_SCORE_SECONDS = 25 * 60;
// Sem rota: linha reta a 40 km/h, a mesma estimativa do routingService quando nenhum motor responde
const ESTIMATE_SPEED = 40 / 3.6;

export interface Candidate {
  id: string;
  code: string;
  type: string;
  status: string;
  location: Coordinates;
}

export const estimateSeconds = (from: Coordinates, to: Coordinates) => Math.round(distanceMeters(from, to) / ESTIMATE_SPEED);

// Nome do tipo como a equipe fala (o tipo vem do banco em maiúsculas, sem acento)
const TYPE_LABEL: Record<string, string> = { USA: 'USA', USB: 'USB', MOTOLANCIA: 'Motolância' };
const typeLabel = (type: string) => TYPE_LABEL[type] ?? type;
const km = (meters: number) => (meters / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Ordem da análise: livres primeiro (só elas podem ser despachadas); depois a maior nota e, no empate, quem chega antes
export function rankScores<T extends { status: string; score: DispatchScore }>(items: T[]): T[] {
  const free = (item: T) => (item.status === AmbulanceStatus.DISPONIVEL ? 0 : 1);
  return [...items].sort(
    (a, b) => free(a) - free(b) || b.score.totalScore - a.score.totalScore || a.score.arrivalSeconds - b.score.arrivalSeconds
  );
}

export function timeScore(seconds: number): number {
  const share = (ZERO_SCORE_SECONDS - seconds) / (ZERO_SCORE_SECONDS - FULL_SCORE_SECONDS);
  return Math.round(100 * Math.min(1, Math.max(0, share)));
}

export function availabilityScore(status: string): number {
  switch (status) {
    case AmbulanceStatus.DISPONIVEL: return 100;
    case AmbulanceStatus.EM_ATENDIMENTO: return 30;
    default: return 0;
  }
}

const TYPE_SCORES: Record<string, Record<string, number>> = {
  [CallPriority.EMERGENCIA]: { [AmbulanceType.USA]: 100, [AmbulanceType.USB]: 70, [AmbulanceType.MOTOLANCIA]: 50 },
  [CallPriority.URGENTE]: { [AmbulanceType.USB]: 100, [AmbulanceType.USA]: 90, [AmbulanceType.MOTOLANCIA]: 60 },
  [CallPriority.PRIORITARIO]: { [AmbulanceType.MOTOLANCIA]: 100, [AmbulanceType.USB]: 80, [AmbulanceType.USA]: 70 },
  [CallPriority.NAO_URGENTE]: { [AmbulanceType.MOTOLANCIA]: 100, [AmbulanceType.USB]: 80, [AmbulanceType.USA]: 70 }
};

export const typeScore = (type: string, priority: string) => TYPE_SCORES[priority]?.[type] ?? 0;

// Ocorrência a até 1 km da viatura ou do chamado (contando da borda da área)
const INCIDENT_PENALTY_DISTANCE = 1000; // metros
const EFFECT_PENALTY: Record<IncidentEffect, number> = {
  [IncidentEffect.BLOQUEIO]: -15,
  [IncidentEffect.RISCO]: -10,
  [IncidentEffect.AVISO]: -5
};

export function incidentPenalty(from: Coordinates, to: Coordinates, incidents: Incident[]): number {
  const nearby = incidents.filter(incident => {
    // Alerta sem área (vale para a cidade toda) pesa igual para todas as viaturas
    if (incident.radius <= 0) return false;
    // Trânsito do TomTom está espalhado pela cidade: pesaria em quase todas; ele entra pelo tempo da rota
    if (incident.source === IncidentSource.TOMTOM) return false;
    const edge = (point: Coordinates) => distanceMeters(point, incident.location) - incident.radius;
    return edge(from) <= INCIDENT_PENALTY_DISTANCE || edge(to) <= INCIDENT_PENALTY_DISTANCE;
  });

  return nearby.reduce((worst, incident) => Math.min(worst, EFFECT_PENALTY[incident.effect] ?? 0), 0);
}

// Tempo até o chamado: o da rota (com trânsito, quando o TomTom respondeu) ou a estimativa em linha reta
export function scoreCandidate(
  ambulance: Candidate,
  callLocation: Coordinates,
  priority: string,
  incidents: Incident[],
  route?: RouteInfo
): DispatchScore {
  const arrivalSeconds = route && route.engine !== 'linha-reta' ? route.duration : estimateSeconds(ambulance.location, callLocation);
  const scores = {
    timeScore: timeScore(arrivalSeconds),
    availabilityScore: availabilityScore(ambulance.status),
    typeScore: typeScore(ambulance.type, priority),
    incidentPenalty: incidentPenalty(ambulance.location, callLocation, incidents)
  };
  const totalScore = Math.round(
    scores.timeScore * WEIGHTS.TIME +
    scores.availabilityScore * WEIGHTS.AVAILABILITY +
    scores.typeScore * WEIGHTS.TYPE +
    scores.incidentPenalty * WEIGHTS.INCIDENTS
  );

  return {
    ambulanceId: ambulance.id,
    totalScore,
    ...scores,
    arrivalSeconds,
    ...(route && { route }),
    explanation: explain(ambulance, callLocation, arrivalSeconds, route, scores.typeScore, scores.incidentPenalty)
  };
}

function explain(
  ambulance: Candidate,
  callLocation: Coordinates,
  arrivalSeconds: number,
  route: RouteInfo | undefined,
  type: number,
  penalty: number
): string {
  // Minutos inteiros, como o tempo da rota no card (16 min e 50 s = "16 min")
  const minutes = Math.max(1, Math.floor(arrivalSeconds / 60));
  const arrival = route && route.engine !== 'linha-reta'
    ? `chega em ~${minutes} min${route.durationSource === 'TRANSITO' ? ' com o trânsito de agora' : ' pela rota'}`
    : `está a ${km(distanceMeters(ambulance.location, callLocation))} km do chamado (~${minutes} min, estimativa sem rota)`;
  const availability = ambulance.status === AmbulanceStatus.DISPONIVEL ? ' e está disponível' : ', mas está em atendimento';
  // "USA-01 (USA) chega em ~6 min com o trânsito de agora e está disponível. É o tipo ideal..."
  const parts = [`${ambulance.code} (${typeLabel(ambulance.type)}) ${arrival}${availability}`];

  if (type >= 90) parts.push('É o tipo ideal para este chamado');
  else if (type >= 70) parts.push('É adequada para este chamado');
  else parts.push('Pode atender, mas não é o tipo ideal');

  if (penalty < 0) parts.push('Atenção: há ocorrências perto da viatura ou do chamado');

  return parts.join('. ') + '.';
}
