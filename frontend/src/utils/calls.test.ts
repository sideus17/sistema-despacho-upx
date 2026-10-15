import { describe, expect, it } from 'vitest';
import { CallPriority, CallStatus, EmergencyCall } from '../types';
import { formatGender, sortCallsByPriority } from './calls';

const call = (id: string, priority: CallPriority, timestamp: string): EmergencyCall => ({
  id,
  priority,
  timestamp,
  location: { lat: -23.5, lng: -47.45 },
  address: 'Rua Teste, 1',
  status: CallStatus.PENDENTE,
  description: '',
  patientInfo: { symptoms: '' }
});

describe('fila de chamados', () => {
  it('mais grave primeiro e, na mesma prioridade, quem espera há mais tempo', () => {
    const sorted = sortCallsByPriority([
      call('prioritario', CallPriority.PRIORITARIO, '2026-10-15T10:00:00Z'),
      call('urgente-novo', CallPriority.URGENTE, '2026-10-15T10:05:00Z'),
      call('emergencia', CallPriority.EMERGENCIA, '2026-10-15T10:10:00Z'),
      call('urgente-antigo', CallPriority.URGENTE, '2026-10-15T09:00:00Z')
    ]);
    expect(sorted.map(c => c.id)).toEqual(['emergencia', 'urgente-antigo', 'urgente-novo', 'prioritario']);
  });

  it('não altera a lista original', () => {
    const calls = [call('b', CallPriority.URGENTE, '2026-10-15T10:00:00Z'), call('a', CallPriority.EMERGENCIA, '2026-10-15T10:00:00Z')];
    sortCallsByPriority(calls);
    expect(calls.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('sexo do paciente por extenso', () => {
    expect(formatGender('M')).toBe('Masculino');
    expect(formatGender('F')).toBe('Feminino');
    expect(formatGender('OUTRO')).toBe('Outro');
    expect(formatGender(undefined)).toBeNull();
  });
});
