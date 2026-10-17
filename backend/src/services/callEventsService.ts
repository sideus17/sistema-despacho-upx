import { supabase } from '../config/supabase';
import { CallEvent } from '../types';
import { CallEventRow, NewCallEvent, toCallEvent } from './callEvents';

// Grava a ação depois que ela aconteceu. Se a auditoria falhar, a ação continua valendo: só fica no log
// (devolver erro faria a tela tentar de novo uma ação que já foi feita).
export async function recordCallEvent(event: NewCallEvent): Promise<void> {
  const { error } = await supabase.from('call_events').insert(event);
  if (error) console.error(`Auditoria: não gravou ${event.action} do chamado ${event.call_id}:`, error.message);
}

// Ações do chamado, na ordem em que aconteceram
export async function listCallEvents(callId: string): Promise<CallEvent[]> {
  const { data, error } = await supabase
    .from('call_events')
    .select('*')
    .eq('call_id', callId)
    .order('at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CallEventRow[]).map(toCallEvent);
}
