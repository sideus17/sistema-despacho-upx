import { supabase } from '../config/supabase';
import { 
  DispatchScore, 
  DispatchRecommendation,
  AmbulanceStatus,
  AmbulanceType,
  CallPriority,
  Coordinates,
  Incident,
  IncidentEffect
} from '../types';
import { calculateRoute } from './routingService';
import { listActiveIncidents } from './incidentService';
import { distanceMeters } from './geo';

const WEIGHTS = {
  DISTANCE: 0.4,
  AVAILABILITY: 0.3,
  TYPE: 0.2,
  INCIDENTS: 0.1
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

  // 2. Buscar as ambulâncias que podem atender (Disponíveis ou já em atendimento),
  //    só as que têm motorista em turno para receber o chamado no app
  const { data: ambsData, error: ambsError } = await supabase
    .from('ambulances')
    .select('*')
    .in('status', [AmbulanceStatus.DISPONIVEL, AmbulanceStatus.EM_ATENDIMENTO])
    .not('driver_id', 'is', null);

  if (ambsError || !ambsData) {
    throw new Error('Erro ao buscar ambulâncias no banco de dados.');
  }

  // 3. Buscar as ocorrências ativas para calcular penalidades de rota
  const incidents = await listActiveIncidents();

  // Calcular score para cada ambulância
  const scores: DispatchScore[] = [];

  for (const amb of ambsData) {
    const ambulanceLocation: Coordinates = { lat: amb.lat, lng: amb.lng };
    const score = calculateDispatchScore(
      amb, 
      callData, 
      ambulanceLocation, 
      callLocation, 
      incidents
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
  incidents: Incident[]
): DispatchScore {
  const distanceScore = calculateDistanceScore(ambLocation, callLocation);
  const availabilityScore = calculateAvailabilityScore(ambulance.status);
  const typeScore = calculateTypeScore(ambulance.type, call.priority);
  const incidentPenalty = calculateIncidentPenalty(ambLocation, callLocation, incidents);

  const totalScore = Math.round(
    (distanceScore * WEIGHTS.DISTANCE) +
    (availabilityScore * WEIGHTS.AVAILABILITY) +
    (typeScore * WEIGHTS.TYPE) +
    (incidentPenalty * WEIGHTS.INCIDENTS)
  );

  const explanation = generateExplanation(
    ambulance,
    callLocation,
    distanceScore,
    availabilityScore,
    typeScore,
    incidentPenalty,
    totalScore
  );

  return {
    ambulanceId: ambulance.id,
    totalScore,
    distanceScore,
    availabilityScore,
    typeScore,
    incidentPenalty,
    route: undefined, // Rota calculada depois apenas para o melhor
    explanation
  };
}

function calculateDistanceScore(from: Coordinates, to: Coordinates): number {
  const distance = distanceMeters(from, to) / 1000;
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

// Ocorrência a até 1 km da viatura ou do chamado (contando da borda da área)
const INCIDENT_PENALTY_DISTANCE = 1000; // metros
const EFFECT_PENALTY: Record<IncidentEffect, number> = {
  [IncidentEffect.BLOQUEIO]: -15,
  [IncidentEffect.RISCO]: -10,
  [IncidentEffect.AVISO]: -5
};

function calculateIncidentPenalty(from: Coordinates, to: Coordinates, incidents: Incident[]): number {
  const nearby = incidents.filter(incident => {
    // Alerta sem área (vale para a cidade toda) pesa igual para todas as viaturas
    if (incident.radius <= 0) return false;
    const edge = (point: Coordinates) => distanceMeters(point, incident.location) - incident.radius;
    return edge(from) <= INCIDENT_PENALTY_DISTANCE || edge(to) <= INCIDENT_PENALTY_DISTANCE;
  });

  return nearby.reduce((worst, incident) => Math.min(worst, EFFECT_PENALTY[incident.effect] ?? 0), 0);
}

function generateExplanation(
  ambulance: any,
  callLocation: Coordinates,
  distanceScore: number,
  availabilityScore: number,
  typeScore: number,
  incidentPenalty: number,
  totalScore: number
): string {
  const parts: string[] = [];
  parts.push(`${ambulance.code} (${ambulance.type})`);

  const distance = distanceMeters({ lat: ambulance.lat, lng: ambulance.lng }, callLocation) / 1000;
  parts.push(`está a ${distance.toFixed(1)}km do chamado`);

  if (ambulance.status === AmbulanceStatus.DISPONIVEL) parts.push('e está disponível');
  else if (ambulance.status === AmbulanceStatus.EM_ATENDIMENTO) parts.push('mas está em atendimento');

  if (typeScore >= 90) parts.push('É o tipo ideal para esta emergência');
  else if (typeScore >= 70) parts.push('É adequada para esta emergência');
  else parts.push('Pode atender, mas não é o tipo ideal');

  if (incidentPenalty < 0) parts.push(`Atenção: há ocorrências perto da viatura ou do chamado (penalidade: ${incidentPenalty})`);

  parts.push(`Score total: ${totalScore}/100`);
  return parts.join('. ') + '.';
}
