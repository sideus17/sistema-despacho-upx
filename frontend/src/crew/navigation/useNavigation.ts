import { useEffect, useMemo, useRef, useState } from 'react';
import { Coordinates, RouteInfo } from '../../types';
import { GeoFix } from './useGeolocation';
import { bearing, cumulativeDistances, distance, projectOnLine, remainingLine } from './geo';

const OFF_ROUTE_METERS = 40;
const OFF_ROUTE_FIXES = 3; // leituras seguidas fora da rota antes de recalcular
const ARRIVAL_METERS = 35;

export interface NavigationState {
  position: Coordinates | null; // posição projetada na rota (ou a real, se fora dela)
  remaining: Coordinates[];
  distanceRemaining: number;
  durationRemaining: number;
  stepIndex: number; // próxima manobra
  distanceToManeuver: number;
  routeBearing: number;
  offRoute: boolean;
  arrived: boolean;
}

export function useNavigation(route: RouteInfo, destination: Coordinates, fix: GeoFix | null): NavigationState {
  const line = route.geometry;
  const cumulative = useMemo(() => cumulativeDistances(line), [line]);
  const total = cumulative[cumulative.length - 1] || route.distance;

  // Onde cada manobra cai ao longo da linha (em metros desde o início)
  const stepAlong = useMemo(() => {
    let fromSegment = 0;
    return route.steps.map(step => {
      const projection = projectOnLine(line, cumulative, step.location, fromSegment);
      fromSegment = projection.segmentIndex;
      return projection.distanceAlong;
    });
  }, [route.steps, line, cumulative]);

  const lastSegment = useRef(0);
  const offRouteCount = useRef(0);

  const [state, setState] = useState<NavigationState>({
    position: null,
    remaining: line,
    distanceRemaining: route.distance,
    durationRemaining: route.duration,
    stepIndex: Math.min(1, route.steps.length - 1),
    distanceToManeuver: route.steps[0]?.distance ?? 0,
    routeBearing: line.length > 1 ? bearing(line[0], line[1]) : 0,
    offRoute: false,
    arrived: false
  });

  // Rota nova (recálculo): recomeça o acompanhamento
  useEffect(() => {
    lastSegment.current = 0;
    offRouteCount.current = 0;
  }, [route]);

  useEffect(() => {
    if (!fix || line.length < 2) return;

    // Busca a partir de um pouco antes do último trecho para não "voltar" na rota
    const projection = projectOnLine(line, cumulative, fix.position, Math.max(0, lastSegment.current - 2));
    const tolerance = Math.max(OFF_ROUTE_METERS, fix.accuracy);
    const isOff = projection.distanceFromLine > tolerance;

    offRouteCount.current = isOff ? offRouteCount.current + 1 : 0;
    if (!isOff) lastSegment.current = projection.segmentIndex;

    const travelled = projection.distanceAlong;
    const distanceRemaining = Math.max(0, total - travelled);
    const nextStep = stepAlong.findIndex((along, i) => i > 0 && along > travelled + 5);
    const stepIndex = nextStep === -1 ? route.steps.length - 1 : nextStep;
    const segment = projection.segmentIndex;

    setState({
      position: isOff ? fix.position : projection.point,
      remaining: remainingLine(line, projection),
      distanceRemaining,
      durationRemaining: total > 0 ? (route.duration * distanceRemaining) / total : 0,
      stepIndex,
      distanceToManeuver: Math.max(0, (stepAlong[stepIndex] ?? total) - travelled),
      routeBearing: bearing(line[segment], line[segment + 1] ?? line[segment]),
      offRoute: offRouteCount.current >= OFF_ROUTE_FIXES,
      arrived: distance(fix.position, destination) < ARRIVAL_METERS || (!isOff && distanceRemaining < 20)
    });
  }, [fix, line, cumulative, stepAlong, total, route, destination]);

  return state;
}
