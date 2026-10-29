import { Ambulance, AmbulanceStatus, AmbulanceType } from '../types';
import { formatWaitShort } from './calls';

// Nome do tipo como a equipe fala (o tipo vem em maiúsculas, sem acento)
export const AMBULANCE_TYPE_LABEL: Record<AmbulanceType, string> = {
  [AmbulanceType.USA]: 'USA',
  [AmbulanceType.USB]: 'USB',
  [AmbulanceType.MOTOLANCIA]: 'Motolância'
};

export const AMBULANCE_STATUS_LABEL: Record<AmbulanceStatus, string> = {
  [AmbulanceStatus.DISPONIVEL]: 'Disponível',
  [AmbulanceStatus.EM_ATENDIMENTO]: 'Em atendimento',
  [AmbulanceStatus.INDISPONIVEL]: 'Indisponível'
};

// O celular manda a posição pelo menos de 5 em 5 min, mesmo parado: sem nada há 7 min, o GPS parou
// (app fechado, tela apagada ou sem sinal) e a posição no mapa pode estar velha
export const STALE_LOCATION_MS = 7 * 60_000;

export function staleLocationText(ambulance: Pick<Ambulance, 'driver' | 'locationUpdatedAt'>, now: number): string | null {
  if (!ambulance.driver || !ambulance.locationUpdatedAt) return null;
  const age = now - Date.parse(ambulance.locationUpdatedAt);
  return age >= STALE_LOCATION_MS ? `GPS sem atualizar há ${formatWaitShort(age)}` : null;
}
