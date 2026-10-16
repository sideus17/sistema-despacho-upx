import { describe, expect, it } from 'vitest';
import { CallPriority, CallStatus, EmergencyCall, Hospital } from '../types';
import { callDestination } from './destination';
import { wazeUrl } from './navigation/mapsLink';

const SANTA_CASA: Hospital = {
  id: 'hosp-santa-casa', name: 'Santa Casa de Misericórdia de Sorocaba', shortName: 'Santa Casa', kind: 'HOSPITAL',
  address: 'Av. São Paulo, 750', location: { lat: -23.4997, lng: -47.4444 }
};

const call = (overrides: Partial<EmergencyCall> = {}): EmergencyCall => ({
  id: 'call-1',
  priority: CallPriority.URGENTE,
  status: CallStatus.EM_ATENDIMENTO,
  timestamp: '2026-10-16T10:00:00Z',
  location: { lat: -23.5, lng: -47.45 },
  address: 'Rua da Penha, 890',
  description: '',
  patientInfo: { symptoms: '' },
  ...overrides
});

describe('destino da equipe', () => {
  it('até chegar ao local, é o chamado (mesmo com hospital já escolhido pela central)', () => {
    expect(callDestination(call({ hospitalId: 'hosp-santa-casa' }), [SANTA_CASA])).toEqual({
      kind: 'chamado', id: 'call-1', location: { lat: -23.5, lng: -47.45 }, label: 'Rua da Penha, 890', priority: CallPriority.URGENTE
    });
  });

  it('no local com hospital escolhido, passa a ser o hospital; sem escolha, continua o local', () => {
    const onScene = { onScene: '2026-10-16T10:10:00Z' };
    expect(callDestination(call({ times: onScene, hospitalId: 'hosp-santa-casa' }), [SANTA_CASA])).toMatchObject({
      kind: 'hospital', id: 'hosp-santa-casa', label: 'Santa Casa'
    });
    expect(callDestination(call({ times: onScene }), [SANTA_CASA]).kind).toBe('chamado');
    // Lista ainda não carregada: fica no chamado até chegar
    expect(callDestination(call({ times: onScene, hospitalId: 'hosp-santa-casa' }), []).kind).toBe('chamado');
  });

  it('Waze abre direto a navegação até o ponto', () => {
    expect(wazeUrl({ lat: -23.4997, lng: -47.4444 })).toBe('https://waze.com/ul?ll=-23.499700,-47.444400&navigate=yes');
  });
});
