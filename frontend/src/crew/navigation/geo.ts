import { Coordinates } from '../../types';

const EARTH_RADIUS = 6371000; // metros
const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const toDeg = (radians: number) => (radians * 180) / Math.PI;

export function distance(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Rumo de a para b, em graus (0 = norte, sentido horário)
export function bearing(a: Coordinates, b: Coordinates): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Distância percorrida até cada ponto da linha
export function cumulativeDistances(line: Coordinates[]): number[] {
  const result = [0];
  for (let i = 1; i < line.length; i++) result.push(result[i - 1] + distance(line[i - 1], line[i]));
  return result;
}

export interface Projection {
  point: Coordinates;
  segmentIndex: number;
  distanceAlong: number; // metros desde o início da linha
  distanceFromLine: number; // metros entre o ponto e a linha
}

/**
 * Ponto da linha mais próximo de `p`. Usa projeção plana local (precisa o bastante na escala de uma cidade).
 * `fromSegment` evita "voltar" para um trecho já percorrido quando a rota passa duas vezes perto do mesmo lugar.
 */
export function projectOnLine(line: Coordinates[], cumulative: number[], p: Coordinates, fromSegment = 0): Projection {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(toRad(p.lat));
  const toXY = (c: Coordinates) => ({ x: (c.lng - p.lng) * metersPerDegLng, y: (c.lat - p.lat) * metersPerDegLat });

  let best: Projection = { point: line[0], segmentIndex: 0, distanceAlong: 0, distanceFromLine: Infinity };

  for (let i = Math.max(0, fromSegment); i < line.length - 1; i++) {
    const a = toXY(line[i]);
    const b = toXY(line[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSq));
    const x = a.x + t * dx;
    const y = a.y + t * dy;
    const dist = Math.hypot(x, y);

    if (dist < best.distanceFromLine) {
      best = {
        point: {
          lat: line[i].lat + t * (line[i + 1].lat - line[i].lat),
          lng: line[i].lng + t * (line[i + 1].lng - line[i].lng)
        },
        segmentIndex: i,
        distanceAlong: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]),
        distanceFromLine: dist
      };
    }
  }

  return best;
}

// Ponto a `meters` do início da linha
export function pointAlong(line: Coordinates[], cumulative: number[], meters: number): { point: Coordinates; segmentIndex: number } {
  if (meters <= 0) return { point: line[0], segmentIndex: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    if (cumulative[i + 1] >= meters) {
      const span = cumulative[i + 1] - cumulative[i];
      const t = span === 0 ? 0 : (meters - cumulative[i]) / span;
      return {
        point: { lat: line[i].lat + t * (line[i + 1].lat - line[i].lat), lng: line[i].lng + t * (line[i + 1].lng - line[i].lng) },
        segmentIndex: i
      };
    }
  }
  return { point: line[line.length - 1], segmentIndex: Math.max(0, line.length - 2) };
}

// Trecho ainda não percorrido, a partir da posição projetada
export function remainingLine(line: Coordinates[], projection: Projection): Coordinates[] {
  return [projection.point, ...line.slice(projection.segmentIndex + 1)];
}

// Onde a linha entra no círculo (metros desde o início), ou null se não passa por ele
export function circleEntryAlong(line: Coordinates[], cumulative: number[], center: Coordinates, radius: number): number | null {
  if (line.length < 2) return line.length === 1 && distance(line[0], center) <= radius ? 0 : null;
  const projection = projectOnLine(line, cumulative, center);
  if (projection.distanceFromLine > radius) return null;
  return Math.max(0, projection.distanceAlong - Math.sqrt(radius ** 2 - projection.distanceFromLine ** 2));
}

// Anel [lng, lat] que aproxima um círculo de raio em metros (o MapLibre não desenha círculos em metros)
export function circlePolygon(center: Coordinates, radiusMeters: number, steps = 64): [number, number][] {
  const angular = radiusMeters / EARTH_RADIUS;
  const lat1 = toRad(center.lat);
  const lng1 = toRad(center.lng);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const heading = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(heading));
    const lng2 = lng1 + Math.atan2(Math.sin(heading) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
    ring.push([toDeg(lng2), toDeg(lat2)]);
  }
  return ring;
}
