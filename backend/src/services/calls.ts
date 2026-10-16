import { CallPriority, CallTriage, EmergencyCall, UserRole } from '../types';

// Chamados: conversão da linha do banco e validação do que vem do formulário. Sem Supabase: dá para testar.

// Sinais de alerta da triagem (os mesmos do formulário da central: frontend/src/utils/triage.ts)
export const TRIAGE_SIGNALS = [
  'NAO_RESPIRA', 'INCONSCIENTE', 'SANGRAMENTO_GRAVE', 'DOR_PEITO', 'AVC', 'CONVULSAO',
  'FALTA_AR', 'TRAUMA', 'PARTO', 'DESMAIO', 'DOR_INTENSA',
  'FEBRE', 'VOMITO', 'FERIMENTO_LEVE', 'DOR_LEVE'
] as const;

export class CallError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const PRIORITIES = Object.values(CallPriority) as string[];

export function parsePriority(input: unknown): CallPriority {
  if (typeof input === 'string' && PRIORITIES.includes(input)) return input as CallPriority;
  throw new CallError(400, 'Escolha a classificação de risco.');
}

// Sinais marcados e a cor que eles sugeriram; códigos desconhecidos são ignorados
export function parseTriage(input: unknown): CallTriage | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as { signals?: unknown; suggested?: unknown };
  const signals = Array.isArray(raw.signals)
    ? [...new Set(raw.signals.filter((signal): signal is string => (TRIAGE_SIGNALS as readonly string[]).includes(signal as string)))]
    : [];
  const suggested = typeof raw.suggested === 'string' && PRIORITIES.includes(raw.suggested) ? (raw.suggested as CallPriority) : null;
  return signals.length > 0 || suggested ? { signals, suggested } : null;
}

// Linha da tabela calls (as colunas da migração 005 podem faltar se ela ainda não rodou)
export interface CallRow {
  id: string;
  lat: number;
  lng: number;
  address: string;
  priority: CallPriority;
  status: EmergencyCall['status'];
  description: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  patient_symptoms?: string | null;
  timestamp: string;
  ambulance_id?: string | null;
  caller_phone?: string | null;
  reference_point?: string | null;
  triage?: CallTriage | null;
}

// O telefone de quem ligou só vai para a central (LGPD): a equipe fala com a central, não com quem ligou
export function toCall(row: CallRow, role: UserRole): EmergencyCall {
  return {
    id: row.id,
    ambulance_id: row.ambulance_id ?? undefined,
    location: { lat: row.lat, lng: row.lng },
    address: row.address,
    priority: row.priority,
    status: row.status,
    description: row.description,
    patientInfo: {
      age: row.patient_age ?? undefined,
      gender: row.patient_gender ?? undefined,
      symptoms: row.patient_symptoms ?? row.description
    },
    timestamp: row.timestamp,
    ...(row.reference_point ? { reference: row.reference_point } : {}),
    ...(row.triage ? { triage: row.triage } : {}),
    ...(role === UserRole.OPERADOR && row.caller_phone ? { callerPhone: row.caller_phone } : {})
  };
}
