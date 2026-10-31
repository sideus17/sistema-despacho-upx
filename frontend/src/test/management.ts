import { CallOutcome, CallPriority, CallStatus, EmergencyCall, Indicators } from '../types';

const stats = (n: number, median: number | null, p90: number | null) => ({ n, median, p90 });

// Indicadores de exemplo (tempos em segundos); cada teste muda só o que importa
export function indicators(overrides: Partial<Indicators> = {}): Indicators {
  return {
    period: { from: '2026-09-17T03:00:00.000Z', to: '2026-10-16T15:00:00.000Z' },
    includeDemo: true,
    targets: { EMERGENCIA: 10, URGENTE: 20, PRIORITARIO: 30, NAO_URGENTE: 60 },
    truncated: false,
    total: 140,
    byStatus: { AGUARDANDO_REGULACAO: 0, PENDENTE: 0, EM_ATENDIMENTO: 0, FINALIZADO: 137, ORIENTADO: 0, CANCELADO: 3 },
    byPriority: { EMERGENCIA: 14, URGENTE: 51, PRIORITARIO: 51, NAO_URGENTE: 24 },
    stages: {
      regulation: stats(0, null, null),
      dispatchWait: stats(0, null, null),
      queue: stats(136, 391, 860),
      departure: stats(129, 60, 111),
      travel: stats(129, 569, 1216),
      response: stats(129, 1091, 1825),
      onScene: stats(129, 902, 1469),
      transport: stats(48, 328, 1091),
      total: stats(136, 2426, 4078)
    },
    response: {
      overall: { ...stats(129, 1091, 1825), withinTarget: 0.76 },
      byPriority: {
        EMERGENCIA: { ...stats(13, 716, 1206), target: 600, withinTarget: 0.31 },
        URGENTE: { ...stats(47, 956, 1704), target: 1200, withinTarget: 0.7 },
        PRIORITARIO: { ...stats(47, 1199, 1991), target: 1800, withinTarget: 0.83 },
        NAO_URGENTE: { ...stats(0, null, null), target: 3600, withinTarget: null }
      }
    },
    byOutcome: { TRANSPORTADO: 48, ATENDIDO_NO_LOCAL: 68, RECUSA: 11, OBITO: 1, NAO_LOCALIZADO: 8 },
    byHospital: [{ hospitalId: 'hosp-santa-casa', count: 12, transportMedian: 305 }],
    byAmbulance: [{ ambulanceId: 'amb-3', count: 45, responseMedian: 1122 }],
    byHour: Array.from({ length: 24 }, (_, hour) => (hour === 18 ? 11 : 3)),
    byDay: [
      { date: '2026-10-15', count: 4, responseMedian: 1020, withinTarget: 0.75, queueMedian: 360 },
      { date: '2026-10-16', count: 7, responseMedian: 1140, withinTarget: 0.8, queueMedian: 420 }
    ],
    quality: { finished: 137, missingOnScene: 8, missingOutcome: 1 },
    ...overrides
  };
}

// Chamado do histórico (finalizado, com as etapas)
export function historyCall(overrides: Partial<EmergencyCall> = {}): EmergencyCall {
  return {
    id: 'demo-1',
    location: { lat: -23.5063, lng: -47.4403 },
    address: 'Vila Hortência, Sorocaba/SP',
    priority: CallPriority.URGENTE,
    status: CallStatus.FINALIZADO,
    ambulance_id: 'amb-3',
    description: 'Queda de moto na avenida, consciente',
    patientInfo: { age: 34, gender: 'M', symptoms: 'Queda de moto na avenida, consciente' },
    timestamp: '2026-10-12T13:43:00Z',
    times: {
      dispatched: '2026-10-12T13:47:00Z',
      enRoute: '2026-10-12T13:48:00Z',
      onScene: '2026-10-12T13:58:00Z',
      leftScene: '2026-10-12T14:15:00Z',
      atHospital: '2026-10-12T14:22:00Z',
      finished: '2026-10-12T14:37:00Z'
    },
    hospitalId: 'hosp-santa-casa',
    outcome: CallOutcome.TRANSPORTADO,
    demo: true,
    ...overrides
  };
}
