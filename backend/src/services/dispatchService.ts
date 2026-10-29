import { supabase } from '../config/supabase';
import { DispatchRecommendation, AmbulanceStatus, CallStatus, Coordinates, RouteInfo } from '../types';
import { CallError } from './calls';
import { calculateRoute } from './routingService';
import { listActiveIncidents } from './incidentService';
import { Candidate, rankScores, scoreCandidate } from './dispatchScore';

export async function analyzeDispatch(callId: string): Promise<DispatchRecommendation> {
  const { data: callData, error: callError } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single();

  if (callError || !callData) throw new CallError(404, 'Chamado não encontrado.');
  assertAwaitingDispatch(callData.status);

  const callLocation: Coordinates = { lat: callData.lat, lng: callData.lng };

  // Viaturas que podem atender (livres ou já em atendimento), só com motorista em turno para receber no app
  const { data: ambsData, error: ambsError } = await supabase
    .from('ambulances')
    .select('*')
    .in('status', [AmbulanceStatus.DISPONIVEL, AmbulanceStatus.EM_ATENDIMENTO])
    .not('driver_id', 'is', null);

  if (ambsError || !ambsData) {
    throw new Error('Erro ao buscar ambulâncias no banco de dados.');
  }

  const incidents = await listActiveIncidents();
  const candidates: Candidate[] = ambsData.map(amb => ({
    id: amb.id,
    code: amb.code,
    type: amb.type,
    status: amb.status,
    location: { lat: amb.lat, lng: amb.lng }
  }));

  // Rota com o trânsito de agora para as livres (as ocupadas não podem ser despachadas: ficam na estimativa)
  const routes = await Promise.all(
    candidates.map(async (candidate): Promise<RouteInfo | undefined> => {
      if (candidate.status !== AmbulanceStatus.DISPONIVEL) return undefined;
      try {
        return await calculateRoute(candidate.location, callLocation);
      } catch (error) {
        console.warn(`Falha ao calcular rota para ${candidate.id}:`, error);
        return undefined;
      }
    })
  );

  const ranked = rankScores(candidates.map((candidate, index) => ({
    status: candidate.status,
    score: scoreCandidate(candidate, callLocation, callData.priority, incidents, routes[index])
  })));

  return {
    callId,
    recommendations: ranked.map(item => item.score),
    timestamp: new Date().toISOString()
  };
}

// Só chamado já regulado e ainda sem viatura pode ser despachado
export function assertAwaitingDispatch(status: CallStatus): void {
  if (status === CallStatus.PENDENTE) return;
  if (status === CallStatus.AGUARDANDO_REGULACAO) throw new CallError(409, 'Regule o chamado antes de despachar.');
  if (status === CallStatus.EM_ATENDIMENTO) throw new CallError(409, 'O chamado já foi despachado.');
  throw new CallError(409, 'O chamado já foi encerrado.');
}
