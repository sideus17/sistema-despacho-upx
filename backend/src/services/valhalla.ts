import axios from 'axios';
import { Coordinates } from '../types';
import { EngineRoute, parseOsrmRoute } from './osrm';

// Servidor público do Valhalla (FOSSGIS). O motor é MIT: em produção comercial, um servidor próprio no lugar
const valhallaUrl = () => process.env.VALHALLA_URL || 'https://valhalla1.openstreetmap.de';
// O servidor público pede um identificador do app em cada consulta
const clientId = () => process.env.VALHALLA_CLIENT_ID || 'samu-despacho-academico';

// Soma máxima dos perímetros das áreas evitadas numa consulta (limite do servidor público: 10 km)
export const maxExcludePerimeter = () => Number(process.env.VALHALLA_MAX_EXCLUDE_PERIMETER) || 9500;

// Não existe caminho sem passar pelas áreas evitadas
export class NoRouteError extends Error {}

export async function valhallaRoute(from: Coordinates, to: Coordinates, exclude: [number, number][][] = []): Promise<EngineRoute> {
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
        ...(exclude.length ? { exclude_polygons: exclude } : {})
      },
      { timeout: 8000, headers: { 'X-Client-Id': clientId() } }
    );

    if (!response.data.routes?.length) throw new Error('Valhalla: nenhuma rota encontrada');
    return parseOsrmRoute(response.data.routes[0]);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.code === 'NoRoute') {
      throw new NoRouteError(error.response.data.message || 'Sem caminho');
    }
    throw error;
  }
}
