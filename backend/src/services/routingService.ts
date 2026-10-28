import { Coordinates, Incident, RouteEngine, RouteIncident, RouteInfo } from '../types';
import { listActiveIncidents } from './incidentService';
import { circleEntryAlong, cumulativeDistances, distanceMeters, exclusionRing, nearCorridor, projectOnLine } from './geo';
import { EngineRoute, osrmRoute } from './osrm';
import { SpeedLimitSegment, maxExcludePerimeter, valhallaRoute, valhallaSpeedLimits } from './valhalla';
import { routeAvoiding } from './avoidance';
import { triggerOfficialRefresh } from './official/refresh';
import { withTraffic } from './tomtomRouting';

// Mesma rota pedida de novo (análise, despacho, prévia da equipe) sai do cache
const CACHE_TTL = 10 * 60_000;
// Rota sem desvio (servidor principal fora) vale pouco: logo tenta de novo
const DEGRADED_CACHE_TTL = 30_000;
const CACHE_MAX = 200;
const MAX_MAPS_WAYPOINTS = 3;
// Caminhos diferentes pedidos além do principal (prévia da rota no app da equipe)
const ALTERNATES = 2;

export interface RouteOptions {
  alternatives?: boolean;
}

const cache = new Map<string, { expires: number; route: Promise<RouteInfo> }>();

/**
 * Rota entre dois pontos desviando das ocorrências ativas no caminho.
 * Valhalla (desvia de áreas) → OSRM (sem desvio) → linha reta.
 * Com `alternatives`, vêm também até 2 caminhos diferentes, que desviam dos mesmos bloqueios.
 * O tempo é o do trânsito de agora (TomTom), quando disponível; com alternativas, a mais rápida vem primeiro.
 */
export async function calculateRoute(from: Coordinates, to: Coordinates, options: RouteOptions = {}): Promise<RouteInfo> {
  triggerOfficialRefresh();
  const { incidents, warning } = await incidentsNear(from, to);

  // Mesmos pontos (~10 m) e mesmas ocorrências no caminho: mesma rota
  const point = (c: Coordinates) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
  const key = [
    point(from),
    point(to),
    options.alternatives ? 'alt' : 'uma',
    ...incidents.map(i => `${i.id}:${i.effect}:${i.radius}`).sort()
  ].join('|');

  // O caminho fica 10 min no cache; o tempo com trânsito é refeito à parte (cache de 3 min)
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.route.then(withTraffic);

  const entry = { expires: Date.now() + CACHE_TTL, route: computeRoute(from, to, incidents, options, warning) };
  cache.set(key, entry);
  entry.route
    .then(route => {
      if (route.engine !== 'valhalla' || warning) entry.expires = Date.now() + DEGRADED_CACHE_TTL;
    })
    .catch(() => cache.delete(key));

  for (const [oldKey, old] of cache) {
    if (cache.size <= CACHE_MAX && old.expires > Date.now()) break;
    cache.delete(oldKey);
  }
  return entry.route.then(withTraffic);
}

// Ocorrências com área perto do trajeto (as de fora não mudam a rota nem o cache)
async function incidentsNear(from: Coordinates, to: Coordinates): Promise<{ incidents: Incident[]; warning?: string }> {
  try {
    const margin = Math.max(2000, 0.3 * distanceMeters(from, to));
    const incidents = (await listActiveIncidents()).filter(
      incident => incident.radius > 0 && nearCorridor(from, to, incident.location, incident.radius, margin)
    );
    return { incidents };
  } catch (error) {
    console.warn('Falha ao buscar ocorrências para a rota:', error);
    return { incidents: [], warning: 'Não foi possível consultar as ocorrências: rota calculada sem desvios.' };
  }
}

async function computeRoute(
  from: Coordinates,
  to: Coordinates,
  incidents: Incident[],
  options: RouteOptions,
  warning?: string
): Promise<RouteInfo> {
  const warnings = warning ? [warning] : [];
  const alternates = options.alternatives ? ALTERNATES : 0;

  try {
    const result = await routeAvoiding(
      from,
      to,
      incidents,
      exclude => valhallaRoute(from, to, exclude.map(incident => exclusionRing(incident.location, incident.radius)), alternates),
      { maxPerimeter: maxExcludePerimeter() }
    );
    const allWarnings = [...warnings, ...result.warnings];
    return withAlternatives(result.route, 'valhalla', incidents, result.excluded, allWarnings);
  } catch (error) {
    console.warn('Valhalla indisponível, usando o OSRM:', error instanceof Error ? error.message : error);
  }

  try {
    const route = await osrmRoute(from, to, alternates > 0);
    return withAlternatives(route, 'osrm', incidents, [], [
      ...warnings,
      'Servidor de rotas principal fora do ar: rota calculada sem desviar das ocorrências.'
    ]);
  } catch (error) {
    console.warn('OSRM indisponível, usando linha reta:', error instanceof Error ? error.message : error);
  }

  return buildRouteInfo(straightLine(from, to), 'linha-reta', incidents, [], [
    ...warnings,
    'Servidores de rotas fora do ar: trajeto aproximado em linha reta.'
  ]);
}

function toRouteIncident(incident: Incident, distanceAlong?: number): RouteIncident {
  return {
    id: incident.id,
    type: incident.type,
    source: incident.source,
    effect: incident.effect,
    location: incident.location,
    radius: incident.radius,
    ambulance: incident.ambulance,
    ...(distanceAlong !== undefined ? { distanceAlong: Math.round(distanceAlong) } : {})
  };
}

// Principal e alternativas com as mesmas ocorrências cruzadas; "evitada" é a que cada caminho não atravessa
function withAlternatives(
  route: EngineRoute,
  engine: RouteEngine,
  incidents: Incident[],
  excluded: Incident[],
  warnings: string[]
): RouteInfo {
  const build = (path: EngineRoute) => {
    const cumulative = cumulativeDistances(path.geometry);
    const avoided = excluded.filter(incident => circleEntryAlong(path.geometry, cumulative, incident.location, incident.radius) === null);
    return buildRouteInfo(path, engine, incidents, avoided, warnings);
  };
  const main = build(route);
  return route.alternatives?.length ? { ...main, alternatives: route.alternatives.map(build) } : main;
}

function buildRouteInfo(
  route: EngineRoute,
  engine: RouteEngine,
  incidents: Incident[],
  avoided: Incident[],
  warnings: string[]
): RouteInfo {
  const cumulative = cumulativeDistances(route.geometry);

  const incidentsOnRoute = incidents
    .map(incident => ({ incident, along: circleEntryAlong(route.geometry, cumulative, incident.location, incident.radius) }))
    .filter((hit): hit is { incident: Incident; along: number } => hit.along !== null)
    .sort((a, b) => a.along - b.along)
    .map(hit => toRouteIncident(hit.incident, hit.along));

  // O link do Google Maps passa pelos pontos da nossa rota mais próximos de cada desvio
  const waypoints = avoided
    .slice(0, MAX_MAPS_WAYPOINTS)
    .map(incident => projectOnLine(route.geometry, cumulative, incident.location).point);

  return {
    distance: Math.round(route.distance),
    duration: Math.round(route.duration),
    geometry: route.geometry,
    steps: route.steps,
    waypoints,
    engine,
    incidentsOnRoute,
    avoided: avoided.map(incident => toRouteIncident(incident)),
    warnings
  };
}

// Último recurso: linha reta a 40 km/h
function straightLine(from: Coordinates, to: Coordinates): EngineRoute {
  const distance = distanceMeters(from, to);
  const duration = (distance / 1000 / 40) * 3600;
  return {
    distance,
    duration,
    geometry: [from, to],
    steps: [
      { type: 'depart', name: '', location: from, distance: Math.round(distance), duration: Math.round(duration) },
      { type: 'arrive', name: '', location: to, distance: 0, duration: 0 }
    ]
  };
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Format distance in meters to human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}
// ============================================
// LIMITE DE VELOCIDADE
// ============================================

const LIMITS_TTL = 30 * 60_000;
const LIMITS_MAX = 100;
const LIMITS_MIN_SPACING = 15; // metros entre pontos enviados ao Valhalla (rota longa vira consulta enorme)
const limitsCache = new Map<string, { expires: number; segments: Promise<SpeedLimitSegment[]> }>();

// Pontos a pelo menos 15 m um do outro, sempre com o primeiro e o último
export function thinLine(line: Coordinates[], spacing = LIMITS_MIN_SPACING): Coordinates[] {
  if (line.length <= 2) return line;
  const thinned = [line[0]];
  for (let i = 1; i < line.length - 1; i++) {
    if (distanceMeters(thinned[thinned.length - 1], line[i]) >= spacing) thinned.push(line[i]);
  }
  thinned.push(line[line.length - 1]);
  return thinned;
}

export async function speedLimitsAlong(line: Coordinates[]): Promise<SpeedLimitSegment[]> {
  const shape = thinLine(line);
  const point = (c: Coordinates) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
  const key = `${shape.length}|${point(shape[0])}|${point(shape[Math.floor(shape.length / 2)])}|${point(shape[shape.length - 1])}`;

  const cached = limitsCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.segments;

  const segments = valhallaSpeedLimits(shape);
  limitsCache.set(key, { expires: Date.now() + LIMITS_TTL, segments });
  segments.catch(() => limitsCache.delete(key));
  for (const [oldKey, old] of limitsCache) {
    if (limitsCache.size <= LIMITS_MAX && old.expires > Date.now()) break;
    limitsCache.delete(oldKey);
  }
  return segments;
}
