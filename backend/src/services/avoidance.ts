import { Coordinates, Incident, IncidentEffect } from '../types';
import { circleEntryAlong, cumulativeDistances, distanceMeters, exclusionPerimeter } from './geo';
import { EngineRoute } from './osrm';
import { NoRouteError } from './valhalla';
import { incidentLabel } from './incidentLabels';

// Calcula a rota evitando as áreas indicadas (o motor recebe as ocorrências e monta os polígonos)
export type AvoidingEngine = (exclude: Incident[]) => Promise<EngineRoute>;

export interface AvoidanceOptions {
  maxPerimeter: number; // soma dos perímetros das áreas evitadas por consulta, em metros
  rounds?: number; // recálculos para bloqueios que a rota nova passe a atravessar
}

export interface AvoidanceResult {
  route: EngineRoute;
  avoided: Incident[];
  warnings: string[];
}

// Origem/destino "dentro" da área: o motor encaixa o ponto na rua mais próxima, que pode estar alguns metros além
const INSIDE_MARGIN = 30; // metros
// Desviar de um risco vale a pena se custar até 20% a mais, entre 1 e 3 minutos
const RISK_EXTRA_RATIO = 0.2;
const RISK_EXTRA_MIN = 60; // segundos
const RISK_EXTRA_MAX = 180; // segundos

export function riskDetourLimit(duration: number): number {
  return Math.min(RISK_EXTRA_MAX, Math.max(RISK_EXTRA_MIN, duration * RISK_EXTRA_RATIO));
}

/**
 * Bloqueio: a rota desvia sempre que houver caminho.
 * Risco: desvia só se o desvio custar pouco; senão a rota passa pela área (e o app avisa).
 * A origem ou o destino dentro de uma área não tem como evitá-la: ela fica só como aviso.
 */
export async function routeAvoiding(
  from: Coordinates,
  to: Coordinates,
  incidents: Incident[],
  engine: AvoidingEngine,
  options: AvoidanceOptions
): Promise<AvoidanceResult> {
  const warnings: string[] = [];
  const avoidable = incidents.filter(
    incident => incident.radius > 0 && (incident.effect === IncidentEffect.BLOQUEIO || incident.effect === IncidentEffect.RISCO)
  );

  const inside = (point: Coordinates, incident: Incident) => distanceMeters(point, incident.location) <= incident.radius + INSIDE_MARGIN;
  const candidates: Incident[] = [];
  for (const incident of avoidable) {
    if (inside(to, incident)) warnings.push(`O destino fica na área de ${incidentLabel(incident)}.`);
    else if (inside(from, incident)) warnings.push(`A viatura está na área de ${incidentLabel(incident)}.`);
    else candidates.push(incident);
  }

  let route = await engine([]);
  let excluded: Incident[] = [];

  // Áreas que a rota atravessa, na ordem em que aparecem
  const crossed = (current: EngineRoute, list: Incident[]) => {
    const cumulative = cumulativeDistances(current.geometry);
    return list
      .filter(incident => !excluded.includes(incident))
      .map(incident => ({ incident, along: circleEntryAlong(current.geometry, cumulative, incident.location, incident.radius) }))
      .filter((hit): hit is { incident: Incident; along: number } => hit.along !== null)
      .sort((a, b) => a.along - b.along)
      .map(hit => hit.incident);
  };

  // O que cabe no limite de perímetro do servidor, além do que já está sendo evitado
  const fitting = (extra: Incident[]) => {
    let used = excluded.reduce((sum, incident) => sum + exclusionPerimeter(incident.radius), 0);
    const result: Incident[] = [];
    for (const incident of extra) {
      const perimeter = exclusionPerimeter(incident.radius);
      if (used + perimeter > options.maxPerimeter) continue;
      used += perimeter;
      result.push(incident);
    }
    return result;
  };

  // Recalcula evitando também `extra`: 'sem-caminho' se não houver alternativa, null se o motor falhar
  const attempt = async (extra: Incident[]): Promise<EngineRoute | 'sem-caminho' | null> => {
    try {
      return await engine([...excluded, ...extra]);
    } catch (error) {
      if (!(error instanceof NoRouteError)) {
        console.warn('Falha ao recalcular o desvio:', error instanceof Error ? error.message : error);
        warnings.push('Não foi possível calcular o desvio agora.');
      }
      return error instanceof NoRouteError ? 'sem-caminho' : null;
    }
  };

  // Bloqueios: evita os que a rota atravessa e repete, porque o caminho novo pode cair em outro
  const blocks = candidates.filter(incident => incident.effect === IncidentEffect.BLOQUEIO);
  for (let round = 0; round < (options.rounds ?? 3); round++) {
    const hits = crossed(route, blocks);
    if (hits.length === 0) break;

    const next = fitting(hits);
    if (next.length === 0) {
      warnings.push(`Áreas bloqueadas demais para desviar de todas: a rota passa por ${hits.map(incidentLabel).join(', ')}.`);
      break;
    }

    const result = await attempt(next);
    if (result === 'sem-caminho') {
      warnings.push(`Não há caminho sem passar por ${next.map(incidentLabel).join(', ')}.`);
      break;
    }
    if (!result) break;
    route = result;
    excluded = [...excluded, ...next];
  }

  // Riscos: um único recálculo, aceito se o desvio sair barato
  const risks = crossed(route, candidates.filter(incident => incident.effect === IncidentEffect.RISCO));
  const next = fitting(risks);
  if (next.length > 0) {
    const result = await attempt(next);
    if (result && result !== 'sem-caminho' && result.duration - route.duration <= riskDetourLimit(route.duration)) {
      route = result;
      excluded = [...excluded, ...next];
    }
  }

  // Evitada de fato: estava no caminho e a rota final não passa mais por ela
  const cumulative = cumulativeDistances(route.geometry);
  const avoided = excluded.filter(incident => circleEntryAlong(route.geometry, cumulative, incident.location, incident.radius) === null);
  return { route, avoided, warnings };
}
