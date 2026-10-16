import { supabase } from '../config/supabase';
import { CallStatus, Coordinates, Hospital } from '../types';
import { detectProgress } from './attendance';
import { CallRow } from './calls';

interface HospitalRow {
  id: string;
  name: string;
  short_name: string;
  kind: Hospital['kind'];
  address: string;
  lat: number;
  lng: number;
  notes: string | null;
}

const toHospital = (row: HospitalRow): Hospital => ({
  id: row.id,
  name: row.name,
  shortName: row.short_name,
  kind: row.kind,
  address: row.address,
  location: { lat: row.lat, lng: row.lng },
  ...(row.notes ? { notes: row.notes } : {})
});

// A lista quase não muda (só pelo banco): 10 min de cache, consultada a cada posição de viatura em atendimento
const HOSPITALS_TTL = 10 * 60_000;
let hospitalsCache: { expires: number; list: Promise<Hospital[]> } | null = null;

export function listHospitals(): Promise<Hospital[]> {
  if (hospitalsCache && hospitalsCache.expires > Date.now()) return hospitalsCache.list;
  const list = (async () => {
    const { data, error } = await supabase.from('hospitals').select('*').eq('active', true).order('short_name');
    if (error) throw new Error(error.message);
    return (data as HospitalRow[]).map(toHospital);
  })();
  hospitalsCache = { expires: Date.now() + HOSPITALS_TTL, list };
  list.catch(() => { hospitalsCache = null; });
  return list;
}

// Posição nova da viatura: marca as etapas do chamado que ela está atendendo
export async function trackCallProgress(ambulanceId: string, position: Coordinates, speed: number | null): Promise<void> {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('ambulance_id', ambulanceId)
    .eq('status', CallStatus.EM_ATENDIMENTO)
    .limit(1);
  if (error) throw new Error(error.message);
  const call = data?.[0] as CallRow | undefined;
  if (!call) return;

  const update = detectProgress(call, position, speed, await listHospitals(), new Date().toISOString());
  const columns = Object.keys(update) as Array<keyof typeof update>;
  if (columns.length === 0) return;

  // Só grava o que ainda está vazio: duas posições quase juntas não regravam a etapa
  let query = supabase.from('calls').update(update).eq('id', call.id).eq('status', CallStatus.EM_ATENDIMENTO);
  for (const column of columns) query = query.is(column, null);
  const { error: updateError } = await query;
  if (updateError) throw new Error(updateError.message);
}
