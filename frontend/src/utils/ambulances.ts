import { AmbulanceStatus } from '../types';

export const AMBULANCE_STATUS_LABEL: Record<AmbulanceStatus, string> = {
  [AmbulanceStatus.DISPONIVEL]: 'Disponível',
  [AmbulanceStatus.EM_ATENDIMENTO]: 'Em atendimento',
  [AmbulanceStatus.INDISPONIVEL]: 'Indisponível'
};
