import axios from 'axios';
import { Coordinates, RouteStep } from '../types';

// Rota devolvida por um motor (Valhalla ou OSRM), antes de cruzar com as ocorrências
export interface EngineRoute {
  distance: number; // metros
  duration: number; // segundos
  geometry: Coordinates[];
  steps: RouteStep[];
  alternatives?: EngineRoute[]; // outros caminhos, quando pedidos
}

// Servidor público do OSRM: reserva quando o Valhalla não responde (não desvia de áreas)
const osrmUrl = () => process.env.OSRM_URL || 'https://router.project-osrm.org';

/**
 * Converte uma rota no formato do OSRM (o Valhalla também responde nele).
 * O motor não manda o texto da instrução, só o tipo de manobra: o app monta a frase.
 */
export function parseOsrmRoute(route: any): EngineRoute {
  const steps: RouteStep[] = [];
  const legs: any[] = route.legs || [];
  legs.forEach((leg, legIndex) => {
    for (const step of leg.steps || []) {
      // Chegada num ponto intermediário não é destino
      if (step.maneuver?.type === 'arrive' && legIndex < legs.length - 1) continue;
      if (step.maneuver?.type === 'depart' && legIndex > 0) continue;

      steps.push({
        type: step.maneuver?.type || 'continue',
        modifier: step.maneuver?.modifier,
        name: step.name || '',
        location: { lng: step.maneuver?.location?.[0], lat: step.maneuver?.location?.[1] },
        distance: step.distance,
        duration: step.duration,
        exit: step.maneuver?.exit
      });
    }
  });

  return {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry.coordinates.map((coord: number[]) => ({ lng: coord[0], lat: coord[1] })),
    steps
  };
}

// A primeira é a principal; as outras (quando pedidas) vêm como alternativas dela
export function parseOsrmRoutes(routes: any[]): EngineRoute {
  const [main, ...others] = routes.map(parseOsrmRoute);
  return others.length ? { ...main, alternatives: others } : main;
}

export async function osrmRoute(from: Coordinates, to: Coordinates, alternatives = false): Promise<EngineRoute> {
  const url = `${osrmUrl()}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`;
  const params = { overview: 'full', geometries: 'geojson', steps: 'true', ...(alternatives ? { alternatives: 'true' } : {}) };
  const response = await axios.get(url, { params, timeout: 5000 });

  if (response.data.code !== 'Ok' || !response.data.routes?.length) throw new Error('OSRM: nenhuma rota encontrada');
  return parseOsrmRoutes(response.data.routes);
}
