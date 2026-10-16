import axios from 'axios';
import { Coordinates, RouteInfo } from '../types';
import { cumulativeDistances } from './geo';
import { tomtomConfigured, tomtomUrl } from './official/tomtom';
import { tomtomBudget } from './official/tomtomBudget';

// Tempo com trânsito: o Valhalla escolhe o caminho (e desvia das ocorrências); o TomTom só cronometra

export interface TrafficTime {
  duration: number; // segundos, com o trânsito de agora
  delay: number; // segundos a mais por causa do trânsito
}

const MAX_SUPPORTING_POINTS = 150;
const TIME_TTL = 3 * 60_000;
const TIME_CACHE_MAX = 300;
// O TomTom refaz o caminho pelos pontos de apoio; se o comprimento mudar muito, ele foi por outro lugar
const MAX_LENGTH_DIFFERENCE = 0.15;

// No máximo `max` pontos espalhados por igual, sempre com o primeiro e o último
export function supportingPoints(line: Coordinates[], max = MAX_SUPPORTING_POINTS): Coordinates[] {
  if (line.length <= max) return line;
  const step = (line.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => line[Math.round(i * step)]);
}

// Tempo do TomTom em cada rota; a lista volta da mais rápida para a mais lenta (só quando há alternativas)
export function applyTrafficTimes(route: RouteInfo, times: Array<TrafficTime | null>): RouteInfo {
  const all = [route, ...(route.alternatives ?? [])].map((option, index): RouteInfo => {
    const time = times[index];
    const { alternatives: _alternatives, ...rest } = option;
    return time
      ? { ...rest, duration: time.duration, trafficDelay: time.delay, durationSource: 'TRANSITO' }
      : { ...rest, durationSource: 'ESTIMATIVA' };
  });
  if (!route.alternatives) return all[0];
  const [first, ...others] = [...all].sort((a, b) => a.duration - b.duration);
  return { ...first, alternatives: others };
}

const cache = new Map<string, { expires: number; time: Promise<TrafficTime | null> }>();

async function fetchTrafficTime(points: Coordinates[], length: number): Promise<TrafficTime | null> {
  if (!tomtomBudget.spend('request', true)) return null;
  const from = points[0];
  const to = points[points.length - 1];
  try {
    const response = await axios.post(
      `${tomtomUrl()}/routing/1/calculateRoute/${from.lat},${from.lng}:${to.lat},${to.lng}/json`,
      { supportingPoints: points.map(point => ({ latitude: point.lat, longitude: point.lng })) },
      { params: { key: process.env.TOMTOM_API_KEY, traffic: true, routeType: 'fastest', travelMode: 'car' }, timeout: 4000 }
    );
    const summary = response.data?.routes?.[0]?.summary;
    const duration = Number(summary?.travelTimeInSeconds);
    const meters = Number(summary?.lengthInMeters);
    if (!Number.isFinite(duration) || !Number.isFinite(meters)) return null;
    if (length > 0 && Math.abs(meters - length) / length > MAX_LENGTH_DIFFERENCE) return null;
    return { duration, delay: Math.max(0, Number(summary.trafficDelayInSeconds) || 0) };
  } catch {
    // Sem resposta: vale o tempo do Valhalla (a mensagem do erro teria a chave)
    return null;
  }
}

export function trafficTime(line: Coordinates[]): Promise<TrafficTime | null> {
  if (!tomtomConfigured() || line.length < 2) return Promise.resolve(null);
  const points = supportingPoints(line);
  const key = points.map(point => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join(';');
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.time;

  const cumulative = cumulativeDistances(line);
  const time = fetchTrafficTime(points, cumulative[cumulative.length - 1]);
  cache.delete(key);
  cache.set(key, { expires: Date.now() + TIME_TTL, time });
  time.then(result => { if (!result) cache.delete(key); });
  for (const [oldKey, old] of cache) {
    if (cache.size <= TIME_CACHE_MAX && old.expires > Date.now()) break;
    cache.delete(oldKey);
  }
  return time;
}

// Rota (e alternativas) com o tempo do trânsito de agora; a linha reta fica com a estimativa
export async function withTraffic(route: RouteInfo): Promise<RouteInfo> {
  const options = [route, ...(route.alternatives ?? [])];
  const times = await Promise.all(
    options.map(option => (option.engine === 'linha-reta' ? Promise.resolve(null) : trafficTime(option.geometry)))
  );
  return applyTrafficTimes(route, times);
}
