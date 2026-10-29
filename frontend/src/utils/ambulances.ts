import { AmbulanceStatus, AmbulanceType } from '../types';

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
