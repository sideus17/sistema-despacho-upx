import { supabase } from '../config/supabase';
import { 
  DispatchScore, 
  DispatchRecommendation,
  AmbulanceStatus,
  AmbulanceType,
  CallPriority,
  RiskLevel,
  Coordinates
} from '../types';
import { calculateRoute } from './routingService';

const WEIGHTS = {
  DISTANCE: 0.4,
  AVAILABILITY: 0.3,
  TYPE: 0.2,
  WEATHER: 0.1
};

export async function analyzeDispatch(callId: string): Promise<DispatchRecommendation> {
  // 1. Buscar informações do chamado no Supabase
  const { data: callData, error: callError } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single();
  
  if (callError || !callData) {
    throw new Error(`Chamado ${callId} não encontrado no banco de dados.`);
  }

  const callLocation: Coordinates = { lat: callData.lat, lng: callData.lng };

  // 2. Buscar todas as ambulâncias que podem atender (Disponíveis ou já em atendimento)
  const { data: ambsData, error: ambsError } = await supabase
    .from('ambulances')
    .select('*')
    .in('status', [AmbulanceStatus.DISPONIVEL, AmbulanceStatus.EM_ATENDIMENTO]);

  if (ambsError || !ambsData) {
    throw new Error('Erro ao buscar ambulâncias no banco de dados.');
  }

  // 3. Buscar eventos climáticos ativos para calcular penalidades de rota
  const { data: weatherData } = await supabase.from('weather_events').select('*');
  const weatherEvents = (weatherData || []).map(w => ({
    id: w.id,
    location: { lat: w.lat, lng: w.lng },
    riskLevel: w.risk_level as RiskLevel
  }));

  // Calcular score para cada ambulância
  const scores: DispatchScore[] = [];

  for (const amb of ambsData) {
    const ambulanceLocation: Coordinates = { lat: amb.lat, lng: amb.lng };
    const score = calculateDispatchScore(
      amb, 
      callData, 
      ambulanceLocation, 
      callLocation, 
      weatherEvents
    );
    scores.push(score);
  }

  // Ordenar por score total (maior primeiro = melhor opção)
  scores.sort((a, b) => b.totalScore - a.totalScore);

  // Calcula a rota real apenas para a melhor opção
  const bestScore = scores[0];
  if (bestScore) {
    const bestAmbulance = ambsData.find(a => a.id === bestScore.ambulanceId);
    if (bestAmbulance) {
      try {
        bestScore.route = await calculateRoute(
          { lat: bestAmbulance.lat, lng: bestAmbulance.lng }, 
          callLocation
        );
      } catch (error) {
        console.warn(`Falha ao calcular rota para ${bestAmbulance.id}:`, error);
      }
    }
  }

  return {
    callId,
    recommendations: scores,
    timestamp: new Date().toISOString()
  };
}

function calculateDispatchScore(
  ambulance: any, 
  call: any, 
  ambLocation: Coordinates,
  callLocation: Coordinates,
  weatherEvents: any[]
): DispatchScore {
  const distanceScore = calculateDistanceScore(ambLocation, callLocation);
  const availabilityScore = calculateAvailabilityScore(ambulance.status);
  const typeScore = calculateTypeScore(ambulance.type, call.priority);
  const weatherPenalty = calculateWeatherPenalty(ambLocation, callLocation, weatherEvents);

  const totalScore = Math.round(
    (distanceScore * WEIGHTS.DISTANCE) +
    (availabilityScore * WEIGHTS.AVAILABILITY) +
    (typeScore * WEIGHTS.TYPE) +
    (weatherPenalty * WEIGHTS.WEATHER)
  );

  const explanation = generateExplanation(
    ambulance,
    callLocation,
    distanceScore,
    availabilityScore,
    typeScore,
    weatherPenalty,
    totalScore
  );

  return {
    ambulanceId: ambulance.id,
    totalScore,
    distanceScore,
    availabilityScore,
    typeScore,
    weatherPenalty,
    route: undefined, // Rota calculada depois apenas para o melhor
    explanation
  };
}

function calculateDistanceScore(from: Coordinates, to: Coordinates): number {
  const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng);
  const maxDistance = 20;
  const score = Math.max(0, 100 - (distance / maxDistance) * 100);
  return Math.round(score);
}

function calculateAvailabilityScore(status: string): number {
  switch (status) {
    case AmbulanceStatus.DISPONIVEL: return 100;
    case AmbulanceStatus.EM_ATENDIMENTO: return 30;
    default: return 0;
  }
}

function calculateTypeScore(type: string, priority: string): number {
  const scoreMatrix: Record<string, Record<string, number>> = {
    [CallPriority.EMERGENCIA]: { [AmbulanceType.USA]: 100, [AmbulanceType.USB]: 70, [AmbulanceType.MOTOLANCIA]: 50 },
    [CallPriority.URGENTE]: { [AmbulanceType.USB]: 100, [AmbulanceType.USA]: 90, [AmbulanceType.MOTOLANCIA]: 60 },
    [CallPriority.PRIORITARIO]: { [AmbulanceType.MOTOLANCIA]: 100, [AmbulanceType.USB]: 80, [AmbulanceType.USA]: 70 }
  };
  return scoreMatrix[priority]?.[type] || 0;
}

function calculateWeatherPenalty(from: Coordinates, to: Coordinates, events: any[]): number {
  // Verifica eventos num raio de 1km (~1000m) da ambulância ou do chamado
  const nearbyEvents = events.filter(e => {
    const distToAmb = calculateDistance(from.lat, from.lng, e.location.lat, e.location.lng);
    const distToCall = calculateDistance(to.lat, to.lng, e.location.lat, e.location.lng);
    return distToAmb <= 1 || distToCall <= 1; // 1 km
  });
  
  if (nearbyEvents.length === 0) return 0;

  const riskOrder = [RiskLevel.BAIXO, RiskLevel.MEDIO, RiskLevel.ALTO, RiskLevel.CRITICO];
  const worstRisk = nearbyEvents.reduce((worst, event) => {
    return riskOrder.indexOf(event.riskLevel) > riskOrder.indexOf(worst) ? event.riskLevel : worst;
  }, RiskLevel.BAIXO);

  const penaltyMap: Record<string, number> = {
    [RiskLevel.CRITICO]: -15,
    [RiskLevel.ALTO]: -10,
    [RiskLevel.MEDIO]: -5,
    [RiskLevel.BAIXO]: -2
  };

  return penaltyMap[worstRisk] || 0;
}

function generateExplanation(
  ambulance: any,
  callLocation: Coordinates,
  distanceScore: number,
  availabilityScore: number,
  typeScore: number,
  weatherPenalty: number,
  totalScore: number
): string {
  const parts: string[] = [];
  parts.push(`${ambulance.code} (${ambulance.type})`);

  const distance = calculateDistance(ambulance.lat, ambulance.lng, callLocation.lat, callLocation.lng);
  parts.push(`está a ${distance.toFixed(1)}km do chamado`);

  if (ambulance.status === AmbulanceStatus.DISPONIVEL) parts.push('e está disponível');
  else if (ambulance.status === AmbulanceStatus.EM_ATENDIMENTO) parts.push('mas está em atendimento');

  if (typeScore >= 90) parts.push('É o tipo ideal para esta emergência');
  else if (typeScore >= 70) parts.push('É adequada para esta emergência');
  else parts.push('Pode atender, mas não é o tipo ideal');

  if (weatherPenalty < 0) parts.push(`Atenção: há eventos climáticos na rota (penalidade: ${weatherPenalty})`);

  parts.push(`Score total: ${totalScore}/100`);
  return parts.join('. ') + '.';
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; 
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