import { Incident, IncidentEffect, IncidentSource, IncidentType } from '../types';

// Ocorrência de exemplo para os testes; cada teste muda só o que importa
export function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 'i1',
    type: IncidentType.VIA_BLOQUEADA,
    source: IncidentSource.EQUIPE,
    effect: IncidentEffect.RISCO,
    location: { lat: -23.5015, lng: -47.4526 },
    radius: 100,
    description: null,
    createdAt: '2026-10-16T10:00:00Z',
    expiresAt: null,
    lastConfirmedAt: null,
    createdBy: null,
    ambulance: null,
    geometry: null,
    votes: { yes: 0, no: 0 },
    myVote: null,
    ...overrides
  };
}
