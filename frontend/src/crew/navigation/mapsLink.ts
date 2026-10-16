import { Coordinates } from '../../types';
import { cumulativeDistances, pointAlong, projectOnLine } from './geo';

const MAX_WAYPOINTS = 3; // limite do link do Google Maps no celular

const format = (c: Coordinates) => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`;

/**
 * Link do Google Maps que segue a NOSSA rota: não há como passar a linha inteira por URL,
 * então forçamos pontos de passagem tirados dela (incluindo o ponto de desvio de área de risco).
 * Entre um ponto e outro o Maps ainda escolhe o caminho, mas fica preso ao nosso trajeto.
 */
export function googleMapsUrl(origin: Coordinates, destination: Coordinates, route: Coordinates[], detours: Coordinates[] = []): string {
  const cumulative = route.length > 1 ? cumulativeDistances(route) : [0];
  const total = cumulative[cumulative.length - 1];
  const stops: Array<{ along: number; point: Coordinates }> = [];

  if (total > 400) {
    // Pontos de desvio que ainda estão à frente têm prioridade
    for (const detour of detours) {
      const projection = projectOnLine(route, cumulative, detour);
      if (projection.distanceFromLine < 300 && projection.distanceAlong > 50 && projection.distanceAlong < total - 50) {
        stops.push({ along: projection.distanceAlong, point: detour });
      }
    }

    // Completa com pontos espaçados ao longo da rota, longe dos que já existem
    for (const fraction of [0.5, 0.25, 0.75]) {
      if (stops.length >= MAX_WAYPOINTS) break;
      const along = total * fraction;
      if (stops.some(stop => Math.abs(stop.along - along) < total * 0.15)) continue;
      stops.push({ along, point: pointAlong(route, cumulative, along).point });
    }
  }

  const params = new URLSearchParams({
    api: '1',
    origin: format(origin),
    destination: format(destination),
    travelmode: 'driving'
  });
  const waypoints = stops
    .slice(0, MAX_WAYPOINTS)
    .sort((a, b) => a.along - b.along)
    .map(stop => format(stop.point))
    .join('|');
  if (waypoints) params.set('waypoints', waypoints);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// O Waze não aceita pontos de passagem por link: ele leva ao destino pelo caminho dele
export function wazeUrl(destination: Coordinates): string {
  return `https://waze.com/ul?ll=${format(destination)}&navigate=yes`;
}
