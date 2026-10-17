import { CallPriority, CallStatus, CloseReason, RegulationDecision } from '../types';
import { CallError, CallRow, parsePriority } from './calls';

// Regulação do chamado: o atendente confirma ou muda a cor sugerida no registro e decide se manda viatura,
// se encerra com orientação por telefone ou se cancela. Sem Supabase: dá para testar.

export interface RegulationInput {
  decision: RegulationDecision;
  priority?: CallPriority; // obrigatória para mandar viatura
  hospitalId?: string | null; // ausente: não mexe; null: tira o hospital escolhido
  reason?: CloseReason; // só para cancelar
  note?: string; // orientação dada ou detalhe do cancelamento
}

export const MAX_NOTE = 500;

const DECISIONS = Object.values(RegulationDecision) as string[];
const REASONS = Object.values(CloseReason) as string[];

export function parseRegulation(body: unknown): RegulationInput {
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (typeof raw.decision !== 'string' || !DECISIONS.includes(raw.decision)) {
    throw new CallError(400, 'Escolha o que fazer com o chamado.');
  }
  const decision = raw.decision as RegulationDecision;
  const input: RegulationInput = { decision };

  if (raw.priority != null) input.priority = parsePriority(raw.priority);
  if (decision === RegulationDecision.DESPACHAR && !input.priority) parsePriority(undefined);

  if (raw.hospitalId !== undefined) {
    if (decision !== RegulationDecision.DESPACHAR) throw new CallError(400, 'Hospital de destino só vale quando vai viatura.');
    if (raw.hospitalId !== null && (typeof raw.hospitalId !== 'string' || !raw.hospitalId)) {
      throw new CallError(400, 'Hospital inválido.');
    }
    input.hospitalId = raw.hospitalId as string | null;
  }

  if (raw.note != null) {
    if (typeof raw.note !== 'string') throw new CallError(400, 'Observação inválida.');
    const note = raw.note.trim().replace(/[ \t]+/g, ' ');
    if (note.length > MAX_NOTE) throw new CallError(400, `A observação pode ter até ${MAX_NOTE} caracteres.`);
    if (note) input.note = note;
  }

  if (decision === RegulationDecision.CANCELAR) {
    if (typeof raw.reason !== 'string' || !REASONS.includes(raw.reason)) throw new CallError(400, 'Escolha o motivo do cancelamento.');
    input.reason = raw.reason as CloseReason;
    if (input.reason === CloseReason.OUTRO && !input.note) throw new CallError(400, 'Conte o motivo do cancelamento.');
  } else if (raw.reason != null) {
    throw new CallError(400, 'Motivo só vale para cancelar o chamado.');
  }

  if (decision === RegulationDecision.ORIENTACAO && !input.note) throw new CallError(400, 'Registre a orientação dada por telefone.');
  return input;
}

// O que importa do chamado antes da regulação
export type RegulationBefore = Pick<CallRow, 'status' | 'priority' | 'hospital_id' | 'regulated_at'>;

// O que vai para a auditoria: a decisão e cada campo que mudou ([antes, depois])
export interface RegulationEventData {
  decision: RegulationDecision;
  changes: Partial<Record<'status' | 'priority' | 'hospitalId', [string | null, string | null]>>;
  reason?: CloseReason;
  note?: string;
}

const REGULABLE = [CallStatus.AGUARDANDO_REGULACAO, CallStatus.PENDENTE];

const NEXT_STATUS: Record<RegulationDecision, CallStatus> = {
  [RegulationDecision.DESPACHAR]: CallStatus.PENDENTE,
  [RegulationDecision.ORIENTACAO]: CallStatus.ORIENTADO,
  [RegulationDecision.CANCELAR]: CallStatus.CANCELADO
};

export function regulationChange(
  before: RegulationBefore,
  input: RegulationInput,
  actorId: string,
  now: string
): { update: Partial<CallRow>; data: RegulationEventData } {
  if (!REGULABLE.includes(before.status)) {
    throw new CallError(409, before.status === CallStatus.EM_ATENDIMENTO ? 'O chamado já foi despachado.' : 'O chamado já foi encerrado.');
  }

  const status = NEXT_STATUS[input.decision];
  const update: Partial<CallRow> = {};
  const data: RegulationEventData = { decision: input.decision, changes: {} };

  if (status !== before.status) {
    update.status = status;
    data.changes.status = [before.status, status];
  }
  if (input.priority && input.priority !== before.priority) {
    update.priority = input.priority;
    data.changes.priority = [before.priority, input.priority];
  }
  const hospitalBefore = before.hospital_id ?? null;
  if (input.hospitalId !== undefined && input.hospitalId !== hospitalBefore) {
    update.hospital_id = input.hospitalId;
    data.changes.hospitalId = [hospitalBefore, input.hospitalId];
  }
  if (Object.keys(update).length === 0) throw new CallError(400, 'Nada mudou na regulação.');

  if (input.decision !== RegulationDecision.DESPACHAR) {
    update.finished_at = now;
    update.close_reason = input.reason ?? null;
    update.close_note = input.note ?? null;
  }
  if (input.reason) data.reason = input.reason;
  if (input.note) data.note = input.note;

  // O horário da regulação é o da primeira; as seguintes ficam só na auditoria
  if (!before.regulated_at) {
    update.regulated_at = now;
    update.regulated_by = actorId;
  }
  return { update, data };
}
