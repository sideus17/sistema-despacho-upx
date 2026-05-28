import axios from 'axios';
import { Coordinates, RouteInfo, RouteInstruction, RiskLevel } from '../types';
import { supabase } from '../config/supabase';

// OSRM public server (free)
const OSRM_SERVER = 'https://router.project-osrm.org';

/**
 * Calculate route between two points using OSRM
 */
export async function calculateRoute(from: Coordinates, to: Coordinates): Promise<RouteInfo> {
  try {
    // 1. Busca os eventos climáticos no Supabase primeiro
    const { data: weatherData } = await supabase.from('weather_events').select('*');
    const allWeatherEvents = weatherData || [];

    // Call OSRM API
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

    // Extract geometry (coordinates)
    const geometry: Coordinates[] = route.geometry.coordinates.map((coord: number[]) => ({
      lng: coord[0],
      lat: coord[1]
    }));

    // Extract instructions from steps
    const instructions: RouteInstruction[] = [];
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      for (const step of route.legs[0].steps) {
        instructions.push({
          text: step.maneuver?.instruction || step.name || 'Continue',
          distance: step.distance,
          duration: step.duration
        });
      }
    }

    // Verifica eventos climáticos ao longo da rota usando os dados do Supabase
    const weatherEvents = checkWeatherEventsOnRoute(geometry, allWeatherEvents);
    const riskLevel = calculateRouteRiskLevel(weatherEvents);

    return {
      distance: route.distance,
      duration: route.duration,
      geometry,
      instructions,
      riskLevel,
      weatherEvents
    };

  } catch (error) {
    // Fallback: calculate straight-line distance and estimate time
    console.warn('OSRM route calculation failed, using fallback:', error);
    return await calculateFallbackRoute(from, to);
  }
}

/**
 * Fallback route calculation (straight line)
 */
async function calculateFallbackRoute(from: Coordinates, to: Coordinates): Promise<RouteInfo> {
  const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng) * 1000; // Convert to meters
  const averageSpeed = 40; // km/h in urban areas
  const duration = (distance / 1000) / averageSpeed * 3600; // seconds

  // Simple straight line geometry
  const geometry: Coordinates[] = [from, to];

  // Busca os eventos climáticos no Supabase
  const { data: weatherData } = await supabase.from('weather_events').select('*');
  const allWeatherEvents = weatherData || [];

  // Check for weather events
  const weatherEvents = checkWeatherEventsOnRoute(geometry, allWeatherEvents);
  const riskLevel = calculateRouteRiskLevel(weatherEvents);

  return {
    distance: Math.round(distance),
    duration: Math.round(duration),
    geometry,
    instructions: [
      {
        text: 'Siga em direção ao destino',
        distance: Math.round(distance),
        duration: Math.round(duration)
      }
    ],
    riskLevel,
    weatherEvents
  };
}

/**
 * Check for weather events along the route using local calculation
 */
function checkWeatherEventsOnRoute(geometry: Coordinates[], allEvents: any[]): any[] {
  const events: any[] = [];
  const checkedEvents = new Set<string>();

  // Sample points along the route (every 10th point or at least start/end)
  const sampleInterval = Math.max(1, Math.floor(geometry.length / 10));
  
  for (let i = 0; i < geometry.length; i += sampleInterval) {
    const point = geometry[i];
    
    // Filtra localmente os eventos próximos (500 metros)
    const nearbyEvents = allEvents.filter(e => {
      const dist = calculateDistance(point.lat, point.lng, e.lat, e.lng) * 1000; // em metros
      return dist <= (e.radius || 500);
    });
    
    for (const event of nearbyEvents) {
      if (!checkedEvents.has(event.id)) {
        events.push({
          id: event.id,
          type: event.type,
          location: { lat: event.lat, lng: event.lng },
          radius: event.radius,
          riskLevel: event.risk_level as RiskLevel,
          description: event.description,
          startTime: event.start_time,
          estimatedEndTime: event.estimated_end_time
        });
        checkedEvents.add(event.id);
      }
    }
  }

  // Always check last point
  if (geometry.length > 0) {
    const lastPoint = geometry[geometry.length - 1];
    
    const nearbyEvents = allEvents.filter(e => {
      const dist = calculateDistance(lastPoint.lat, lastPoint.lng, e.lat, e.lng) * 1000;
      return dist <= (e.radius || 500);
    });
    
    for (const event of nearbyEvents) {
      if (!checkedEvents.has(event.id)) {
        events.push({
          id: event.id,
          type: event.type,
          location: { lat: event.lat, lng: event.lng },
          radius: event.radius,
          riskLevel: event.risk_level as RiskLevel,
          description: event.description,
          startTime: event.start_time,
          estimatedEndTime: event.estimated_end_time
        });
        checkedEvents.add(event.id);
      }
    }
  }

  return events;
}

/**
 * Calculate overall risk level for the route
 */
function calculateRouteRiskLevel(weatherEvents: any[]): RiskLevel {
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
 * Haversine formula to calculate distance between two coordinates (in km)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
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