import { Coordinates, Hospital } from '../types';
import { distance } from '../crew/navigation/geo';

export const HOSPITAL_KIND_LABEL: Record<Hospital['kind'], string> = {
  HOSPITAL: 'Hospital',
  PRONTO_SOCORRO: 'Pronto-socorro'
};

// Do mais perto para o mais longe do ponto (chamado ou viatura), com a distância em linha reta
export function hospitalsByDistance(hospitals: Hospital[], from: Coordinates): Array<{ hospital: Hospital; meters: number }> {
  return hospitals
    .map(hospital => ({ hospital, meters: distance(from, hospital.location) }))
    .sort((a, b) => a.meters - b.meters);
}

export const formatKm = (meters: number) => `${(meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
