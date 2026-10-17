import { CallEvent, CallEventAction, UserRole } from '../types';

// Auditoria dos chamados: quem fez cada ação, quando e o que mudou. Sem Supabase: dá para testar.

export interface Actor {
  id: string | null;
  name: string;
  role: UserRole;
}

// O usuário logado (req.user) como autor da ação; o nome fica gravado como era na hora
export function actorOf(user: { id: string; fullName: string; role: UserRole }): Actor {
  return { id: user.id, name: user.fullName, role: user.role };
}

// Linha da tabela call_events (migração 008)
export interface CallEventRow {
  id: number;
  call_id: string;
  at: string;
  action: CallEventAction;
  actor_id: string | null;
  actor_name: string;
  actor_role: UserRole;
  data: Record<string, unknown> | null;
}

export type NewCallEvent = Omit<CallEventRow, 'id' | 'at'> & { at?: string };

export function buildEvent(
  callId: string,
  action: CallEventAction,
  actor: Actor,
  data: object = {},
  at?: string
): NewCallEvent {
  return {
    call_id: callId,
    action,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
    data: { ...data },
    ...(at ? { at } : {})
  };
}

export function toCallEvent(row: CallEventRow): CallEvent {
  return {
    id: row.id,
    at: row.at,
    action: row.action,
    actor: { id: row.actor_id, name: row.actor_name, role: row.actor_role },
    data: row.data ?? {}
  };
}
