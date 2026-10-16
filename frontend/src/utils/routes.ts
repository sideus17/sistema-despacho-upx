import { RouteInfo } from '../types';

// "+4 min de trânsito", quando o trânsito de agora atrasa a rota em pelo menos 1 minuto
export function trafficNote(route: RouteInfo): string | null {
  const minutes = Math.round((route.trafficDelay ?? 0) / 60);
  return minutes >= 1 ? `+${minutes} min de trânsito` : null;
}

// Principal + alternativas, na ordem do servidor (a principal é a primeira)
export const routeOptions = (route: RouteInfo | null): RouteInfo[] => (route ? [route, ...(route.alternatives ?? [])] : []);

// Índice da rota mais rápida (a que ganha o selo)
export function fastestIndex(routes: RouteInfo[]): number {
  return routes.reduce((best, route, index) => (route.duration < routes[best].duration ? index : best), 0);
}

// "via Avenida São Paulo": a rua em que a rota anda mais
export function routeVia(route: RouteInfo): string | null {
  const byStreet = new Map<string, number>();
  for (const step of route.steps) {
    if (!step.name) continue;
    byStreet.set(step.name, (byStreet.get(step.name) ?? 0) + step.distance);
  }
  let via: string | null = null;
  let longest = 0;
  for (const [name, distance] of byStreet) {
    if (distance > longest) {
      via = name;
      longest = distance;
    }
  }
  return via;
}

// Busca sem acento e sem diferença de maiúsculas ("sao" acha "São")
export const normalizeText = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
