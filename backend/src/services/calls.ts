import { CallPriority, CallStatus, CallTriage, Coordinates, EmergencyCall, UserRole } from '../types';
import { distanceMeters } from './geo';
import { insideServiceArea } from './geocodingService';
import { isValidPhone, onlyDigits } from './profile';

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

// Telefone de quem ligou: opcional (nem sempre a central recebe o número); gravado só com os dígitos
export function parseCallerPhone(input: unknown): string | null {
  if (input == null || input === '') return null;
  const phone = typeof input === 'string' ? onlyDigits(input) : '';
  if (!isValidPhone(phone)) throw new CallError(400, 'Telefone inválido. Use DDD + número, ex.: (15) 3232-1234 ou (15) 99999-9999.');
  return phone;
}

const MAX_REFERENCE = 200;

// Ponto de referência ("em frente à padaria"): opcional, até 200 caracteres
export function parseReference(input: unknown): string | null {
  if (input == null) return null;
  if (typeof input !== 'string') throw new CallError(400, 'Ponto de referência inválido.');
  const reference = input.trim().replace(/\s+/g, ' ');
  if (reference.length > MAX_REFERENCE) throw new CallError(400, `O ponto de referência pode ter até ${MAX_REFERENCE} caracteres.`);
  return reference || null;
}

// Ponto escolhido no formulário (sugestão ou clique no mapa): precisa estar na região atendida
export function parseCallLocation(input: unknown): Coordinates | null {
  if (input == null) return null;
  const point = input as { lat?: unknown; lng?: unknown };
  const { lat, lng } = point;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new CallError(400, 'Local do chamado inválido.');
  }
  if (!insideServiceArea({ lat, lng })) throw new CallError(422, 'O local do chamado está fora da região atendida.');
  return { lat, lng };
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

// ============================================
// CHAMADO REPETIDO
// ============================================
// Quem não vê a ambulância chegar liga de novo; vizinhos ligam pelo mesmo acidente

export const RECENT_WINDOW_MS = 2 * 60 * 60_000;
export const SAME_PLACE_METERS = 150;
// Relógio do servidor um pouco atrás do banco: chamado "do futuro" por poucos segundos ainda conta
const CLOCK_SKEW_MS = 60_000;

export type RepeatReason = 'telefone' | 'local';

export interface RecentMatch {
  row: CallRow;
  reasons: RepeatReason[];
  distance: number | null; // metros até o local informado
}

// Chamados das últimas 2 h (cancelados não contam) com o mesmo telefone ou a até 150 m; os mais novos primeiro
export function recentMatches(
  rows: CallRow[],
  query: { phone?: string | null; location?: Coordinates | null },
  now = Date.now()
): RecentMatch[] {
  const matches: RecentMatch[] = [];
  for (const row of rows) {
    if (row.status === CallStatus.CANCELADO) continue;
    const age = now - Date.parse(row.timestamp);
    if (!(age >= -CLOCK_SKEW_MS && age <= RECENT_WINDOW_MS)) continue;

    const distance = query.location ? Math.round(distanceMeters(query.location, { lat: row.lat, lng: row.lng })) : null;
    const reasons: RepeatReason[] = [];
    if (query.phone && row.caller_phone === query.phone) reasons.push('telefone');
    if (distance !== null && distance <= SAME_PLACE_METERS) reasons.push('local');
    if (reasons.length > 0) matches.push({ row, reasons, distance });
  }
  return matches.sort((a, b) => Date.parse(b.row.timestamp) - Date.parse(a.row.timestamp));
}
