import { Coordinates } from '../types';

const EARTH_RADIUS = 6371000; // metros
const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const toDeg = (radians: number) => (radians * 180) / Math.PI;

// Distância em linha reta (Haversine), em metros
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Distância percorrida até cada ponto da linha
export function cumulativeDistances(line: Coordinates[]): number[] {
  const result = [0];
  for (let i = 1; i < line.length; i++) result.push(result[i - 1] + distanceMeters(line[i - 1], line[i]));
  return result;
}

export interface Projection {
  point: Coordinates;
  distanceAlong: number; // metros desde o início da linha
  distanceFromLine: number; // metros entre o ponto e a linha
}

// Ponto da linha mais próximo de `p` (projeção plana local: precisa o bastante na escala de uma cidade)
export function projectOnLine(line: Coordinates[], cumulative: number[], p: Coordinates): Projection {
  if (line.length === 1) return { point: line[0], distanceAlong: 0, distanceFromLine: distanceMeters(line[0], p) };

  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(toRad(p.lat));
  const toXY = (c: Coordinates) => ({ x: (c.lng - p.lng) * metersPerDegLng, y: (c.lat - p.lat) * metersPerDegLat });

  let best: Projection = { point: line[0], distanceAlong: 0, distanceFromLine: Infinity };
  for (let i = 0; i < line.length - 1; i++) {
    const a = toXY(line[i]);
    const b = toXY(line[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSq));
    const dist = Math.hypot(a.x + t * dx, a.y + t * dy);

    if (dist < best.distanceFromLine) {
      best = {
        point: {
          lat: line[i].lat + t * (line[i + 1].lat - line[i].lat),
          lng: line[i].lng + t * (line[i + 1].lng - line[i].lng)
        },
        distanceAlong: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]),
        distanceFromLine: dist
      };
    }
  }
  return best;
}

// Onde a linha entra no círculo (metros desde o início), ou null se não passa por ele
export function circleEntryAlong(line: Coordinates[], cumulative: number[], center: Coordinates, radius: number): number | null {
  if (line.length === 0) return null;
  const projection = projectOnLine(line, cumulative, center);
  if (projection.distanceFromLine > radius) return null;
  const halfChord = Math.sqrt(radius ** 2 - projection.distanceFromLine ** 2);
  return Math.max(0, projection.distanceAlong - halfChord);
}

const EXCLUSION_STEPS = 16;

/**
 * Polígono [lng, lat] fechado que envolve o círculo (vértices um pouco além do raio).
 * Assim, rota que evita o polígono nunca toca o círculo.
 */
export function exclusionRing(center: Coordinates, radius: number): [number, number][] {
  const angular = radius / Math.cos(Math.PI / EXCLUSION_STEPS) / EARTH_RADIUS;
  const lat1 = toRad(center.lat);
  const lng1 = toRad(center.lng);
  const ring: [number, number][] = [];
  for (let i = 0; i <= EXCLUSION_STEPS; i++) {
    const heading = (2 * Math.PI * (i % EXCLUSION_STEPS)) / EXCLUSION_STEPS;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(heading));
    const lng2 = lng1 + Math.atan2(Math.sin(heading) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
    ring.push([toDeg(lng2), toDeg(lat2)]);
  }
  return ring;
}

// Perímetro de `exclusionRing` (o servidor de rotas limita a soma dos perímetros)
export function exclusionPerimeter(radius: number): number {
  return 2 * EXCLUSION_STEPS * radius * Math.tan(Math.PI / EXCLUSION_STEPS);
}

// O círculo toca o retângulo que envolve origem e destino, alargado por `margin` metros?
export function nearCorridor(from: Coordinates, to: Coordinates, center: Coordinates, radius: number, margin: number): boolean {
  const reach = margin + radius;
  const dLat = reach / 111320;
  const dLng = reach / (111320 * Math.cos(toRad((from.lat + to.lat) / 2)));
  return (
    center.lat >= Math.min(from.lat, to.lat) - dLat &&
    center.lat <= Math.max(from.lat, to.lat) + dLat &&
    center.lng >= Math.min(from.lng, to.lng) - dLng &&
    center.lng <= Math.max(from.lng, to.lng) + dLng
  );
}
