import axios from 'axios';
import { Coordinates, Incident, IncidentEffect, RouteInfo, RouteStep, RiskLevel, WeatherEvent } from '../types';
import { listActiveIncidents } from './incidentService';
import { distanceMeters } from './geo';

// OSRM public server (free)
const OSRM_SERVER = 'https://router.project-osrm.org';

/**
 * Calculate route between two points using OSRM
 */
export async function calculateRoute(from: Coordinates, to: Coordinates): Promise<RouteInfo> {
  try {
    // 1. Busca as ocorrências ativas primeiro
    const allWeatherEvents = await activeRouteEvents();

    // 2. Primeira tentativa: Rota mais rápida (direta)
    const url = `${OSRM_SERVER}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`;
    const params = {
      overview: 'full',
      geometries: 'geojson',
      steps: 'true'
    };

    const response = await axios.get(url, { params, timeout: 5000 });

    if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = response.data.routes[0];

    // Extrai a geometria inicial
    let geometry: Coordinates[] = route.geometry.coordinates.map((coord: number[]) => ({
      lng: coord[0],
      lat: coord[1]
    }));

    // Verifica eventos climáticos ao longo desta rota
    let weatherEvents = checkWeatherEventsOnRoute(geometry, allWeatherEvents);
    let riskLevel = calculateRouteRiskLevel(weatherEvents);
    const waypoints: Coordinates[] = [];

    // 3. O PULO DO GATO: Lógica de Desvio Inteligente (Detour)
    if (riskLevel === RiskLevel.CRITICO || riskLevel === RiskLevel.ALTO) {
      console.log(`[ALERTA] Rota intercepta área de risco ${riskLevel}. Calculando desvio...`);
      
      // Pega o evento que está bloqueando a rota
      const blockingEvent = weatherEvents.find(e => e.riskLevel === RiskLevel.CRITICO || e.riskLevel === RiskLevel.ALTO);
      
      if (blockingEvent) {
        // Cria um waypoint (ponto de passagem) forçando a rota a "dar a volta" 
        // Adicionamos aprox. 1.5km (0.015 graus) de distância do epicentro do evento
        const detourWaypoint = {
          lat: blockingEvent.location.lat + 0.015,
          lng: blockingEvent.location.lng - 0.015
        };

        // Chama o OSRM novamente, forçando ele a passar pelo ponto de desvio
        const detourUrl = `${OSRM_SERVER}/route/v1/driving/${from.lng},${from.lat};${detourWaypoint.lng},${detourWaypoint.lat};${to.lng},${to.lat}`;
        
        try {
          const detourResponse = await axios.get(detourUrl, { params, timeout: 5000 });
          
          if (detourResponse.data.code === 'Ok' && detourResponse.data.routes.length > 0) {
            const newRoute = detourResponse.data.routes[0];
            
            // Atualiza os dados com a nova rota desviada
            geometry = newRoute.geometry.coordinates.map((coord: number[]) => ({
              lng: coord[0], lat: coord[1]
            }));
            
            route.distance = newRoute.distance;
            route.duration = newRoute.duration;
            route.legs = newRoute.legs;
            waypoints.push(detourWaypoint);

            // Informa ao frontend que um desvio foi ativado!
            riskLevel = RiskLevel.MEDIO; // O risco diminui porque desviamos do epicentro
            weatherEvents = [{
              ...blockingEvent,
              riskLevel: RiskLevel.MEDIO,
              description: `[DESVIO ATIVADO] Rota alterada para evitar: ${blockingEvent.description}`
            }];
            
            console.log('[SUCESSO] Rota alternativa traçada com sucesso!');
          }
        } catch (detourError) {
          console.warn('Falha ao calcular rota de desvio. Mantendo rota original.', detourError);
        }
      }
    }

    // Extrai as manobras dos steps (funciona para a original ou para a desviada).
    // O OSRM não manda texto de instrução, só o tipo de manobra; o app monta a frase.
    const steps: RouteStep[] = [];
    const legs = route.legs || [];
    legs.forEach((leg: any, legIndex: number) => {
      for (const step of leg.steps || []) {
        // A chegada no ponto de desvio não é destino: some da lista de manobras
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
      geometry,
      steps,
      waypoints,
      riskLevel,
      weatherEvents
    };

  } catch (error) {
    console.warn('OSRM route calculation failed, using fallback:', error);
    return await calculateFallbackRoute(from, to);
  }
}

/**
 * Fallback route calculation (straight line)
 */
async function calculateFallbackRoute(from: Coordinates, to: Coordinates): Promise<RouteInfo> {
  const distance = distanceMeters(from, to);
  const averageSpeed = 40; // km/h in urban areas
  const duration = (distance / 1000) / averageSpeed * 3600; // seconds

  // Simple straight line geometry
  const geometry: Coordinates[] = [from, to];

  const allWeatherEvents = await activeRouteEvents();

  // Check for weather events
  const weatherEvents = checkWeatherEventsOnRoute(geometry, allWeatherEvents);
  const riskLevel = calculateRouteRiskLevel(weatherEvents);

  return {
    distance: Math.round(distance),
    duration: Math.round(duration),
    geometry,
    steps: [
      { type: 'depart', name: '', location: from, distance: Math.round(distance), duration: Math.round(duration) },
      { type: 'arrive', name: '', location: to, distance: 0, duration: 0 }
    ],
    waypoints: [],
    riskLevel,
    weatherEvents
  };
}

// Nível de risco equivalente ao efeito da ocorrência na rota
const EFFECT_RISK: Record<IncidentEffect, RiskLevel> = {
  [IncidentEffect.BLOQUEIO]: RiskLevel.CRITICO,
  [IncidentEffect.RISCO]: RiskLevel.ALTO,
  [IncidentEffect.AVISO]: RiskLevel.MEDIO
};

const INCIDENT_LABEL: Record<string, string> = {
  ALAGAMENTO: 'Alagamento',
  QUEDA_ARVORE: 'Árvore caída',
  VIA_BLOQUEADA: 'Via bloqueada',
  ACIDENTE: 'Acidente',
  VENTOS_FORTES: 'Ventos fortes',
  CHUVA_FORTE: 'Chuva forte',
  ALERTA_OFICIAL: 'Alerta oficial'
};

// Ocorrências ativas com área, no formato que a rota devolve ao app
async function activeRouteEvents(): Promise<WeatherEvent[]> {
  const incidents = await listActiveIncidents().catch(error => {
    console.warn('Falha ao buscar ocorrências para a rota:', error);
    return [] as Incident[];
  });
  return incidents
    .filter(incident => incident.radius > 0)
    .map(incident => ({
      id: incident.id,
      type: incident.type,
      location: incident.location,
      radius: incident.radius,
      riskLevel: EFFECT_RISK[incident.effect],
      description: incident.description ?? INCIDENT_LABEL[incident.type] ?? incident.type,
      startTime: incident.createdAt,
      estimatedEndTime: incident.expiresAt ?? undefined
    }));
}

/**
 * Check for weather events along the route using local calculation
 */
function checkWeatherEventsOnRoute(geometry: Coordinates[], allEvents: WeatherEvent[]): WeatherEvent[] {
  const found = new Map<string, WeatherEvent>();

  // Sample points along the route (every 10th point), always including the last one
  const sampleInterval = Math.max(1, Math.floor(geometry.length / 10));
  const samples = geometry.filter((_, index) => index % sampleInterval === 0 || index === geometry.length - 1);

  for (const point of samples) {
    for (const event of allEvents) {
      if (!found.has(event.id) && distanceMeters(point, event.location) <= event.radius) found.set(event.id, event);
    }
  }

  return [...found.values()];
}

/**
 * Calculate overall risk level for the route
 */
function calculateRouteRiskLevel(weatherEvents: WeatherEvent[]): RiskLevel {
  if (weatherEvents.length === 0) {
    return RiskLevel.BAIXO;
  }

  // Find highest risk level
  const riskOrder = [RiskLevel.BAIXO, RiskLevel.MEDIO, RiskLevel.ALTO, RiskLevel.CRITICO];
  let maxRisk = RiskLevel.BAIXO;

  for (const event of weatherEvents) {
    const currentIndex = riskOrder.indexOf(event.riskLevel);
    const maxIndex = riskOrder.indexOf(maxRisk);
    if (currentIndex > maxIndex) {
      maxRisk = event.riskLevel;
    }
  }

  return maxRisk;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Format distance in meters to human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}