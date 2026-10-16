import axios from 'axios';
import { Coordinates } from '../types';
import { EngineRoute, parseOsrmRoutes } from './osrm';

// Servidor público do Valhalla (FOSSGIS). O motor é MIT: em produção comercial, um servidor próprio no lugar
const valhallaUrl = () => process.env.VALHALLA_URL || 'https://valhalla1.openstreetmap.de';
// O servidor público pede um identificador do app em cada consulta
const clientId = () => process.env.VALHALLA_CLIENT_ID || 'samu-despacho-academico';

// Soma máxima dos perímetros das áreas evitadas numa consulta (limite do servidor público: 10 km)
export const maxExcludePerimeter = () => Number(process.env.VALHALLA_MAX_EXCLUDE_PERIMETER) || 9500;

// Não existe caminho sem passar pelas áreas evitadas
export class NoRouteError extends Error {}

// `alternates`: quantos caminhos diferentes pedir além do principal
export async function valhallaRoute(
  from: Coordinates,
  to: Coordinates,
  exclude: [number, number][][] = [],
  alternates = 0
): Promise<EngineRoute> {
  try {
    const response = await axios.post(
      `${valhallaUrl()}/route`,
      {
        locations: [{ lat: from.lat, lon: from.lng }, { lat: to.lat, lon: to.lng }],
        costing: 'auto',
        language: 'pt-BR',
        // Mesmo formato do OSRM: passos e manobras que o app já entende
        format: 'osrm',
        shape_format: 'geojson',
        ...(exclude.length ? { exclude_polygons: exclude } : {}),
        ...(alternates > 0 ? { alternates } : {})
      },
      { timeout: 8000, headers: { 'X-Client-Id': clientId() } }
    );

    if (!response.data.routes?.length) throw new Error('Valhalla: nenhuma rota encontrada');
    return parseOsrmRoutes(response.data.routes);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.code === 'NoRoute') {
      throw new NoRouteError(error.response.data.message || 'Sem caminho');
    }
    throw error;
  }
}

// Trecho da rota com limite de velocidade conhecido (metros desde o início da rota)
export interface SpeedLimitSegment {
  from: number;
  to: number;
  kmh: number;
}

/**
 * Arestas do `trace_attributes` → trechos com limite, juntando vizinhos com o mesmo valor.
 * Trecho sem limite no OpenStreetMap fica de fora (o app esconde a placa ali).
 */
export function speedLimitSegments(edges: { length?: number; speed_limit?: number | string | null }[]): SpeedLimitSegment[] {
  const segments: SpeedLimitSegment[] = [];
  let along = 0;
  for (const edge of edges) {
    const length = (edge.length ?? 0) * 1000; // km → m
    const kmh = typeof edge.speed_limit === 'number' && edge.speed_limit > 0 ? edge.speed_limit : null;
    const last = segments[segments.length - 1];
    if (kmh !== null) {
      if (last && last.kmh === kmh && Math.abs(last.to - along) < 1) last.to = along + length;
      else segments.push({ from: along, to: along + length, kmh });
    }
    along += length;
  }
  return segments.map(segment => ({ ...segment, from: Math.round(segment.from), to: Math.round(segment.to) }));
}

// Limites de velocidade ao longo de uma rota (o OpenStreetMap tem limite em boa parte das vias de Sorocaba)
export async function valhallaSpeedLimits(shape: Coordinates[]): Promise<SpeedLimitSegment[]> {
  const response = await axios.post(
    `${valhallaUrl()}/trace_attributes`,
    {
      shape: shape.map(point => ({ lat: point.lat, lon: point.lng })),
      costing: 'auto',
      shape_match: 'map_snap',
      filters: { attributes: ['edge.length', 'edge.speed_limit'], action: 'include' }
    },
    { timeout: 10000, headers: { 'X-Client-Id': clientId() } }
  );
  return speedLimitSegments(response.data.edges ?? []);
}
