import { CallPriority, Coordinates, EmergencyCall, Hospital } from '../types';

// Para onde a equipe vai agora: o chamado e, depois de chegar ao local, o hospital escolhido
export interface Destination {
  kind: 'chamado' | 'hospital';
  id: string;
  location: Coordinates;
  label: string;
  priority?: CallPriority; // cor do pino do chamado
}

export function callDestination(call: EmergencyCall, hospitals: Hospital[]): Destination {
  const hospital = call.times?.onScene ? hospitals.find(item => item.id === call.hospitalId) : undefined;
  return hospital
    ? { kind: 'hospital', id: hospital.id, location: hospital.location, label: hospital.shortName }
    : { kind: 'chamado', id: call.id, location: call.location, label: call.address, priority: call.priority };
}
