import { supabase } from '../../config/supabase';
import { IncidentEffect, IncidentSource, IncidentType } from '../../types';
import { cemadenGet } from './cemadenApi';
import { Reading, Sector, heavyRainSectors, recentStations } from './rainRule';

const SOROCABA_IBGE = 3552205;
const HOUR = 3600_000;
const ALERT_DURATION = 2 * HOUR; // renovado enquanto continuar chovendo forte
const MIN_RADIUS = 150;
const MARGIN = 100; // a área do alerta vai um pouco além do setor
// Encerrado pela central não volta logo; pelas equipes ("não está lá"), volta mais cedo
const REOPEN_AFTER_CENTRAL = 6 * HOUR;
const REOPEN_AFTER_CREWS = HOUR;

export interface CemadenResult {
  stations: number; // com leitura recente
  triggered: string[]; // setores em alerta
}

export async function refreshCemaden(): Promise<CemadenResult> {
  const readings = await cemadenGet<Reading[]>('/PED/rest/pcds-acum/acumulados-recentes', { codibge: SOROCABA_IBGE });
  const now = Date.now();

  const triggered: string[] = [];
  for (const { sector, description } of heavyRainSectors(readings, now)) {
    if (await upsertSectorAlert(sector, description, now)) triggered.push(sector.id);
  }
  return { stations: recentStations(readings, now).length, triggered };
}

// Cria ou renova o alerta do setor; devolve false quando ele foi encerrado há pouco e não deve voltar
async function upsertSectorAlert(sector: Sector, description: string, now: number): Promise<boolean> {
  const externalId = `sgb:${sector.id}`;
  const fields = {
    description,
    expires_at: new Date(now + ALERT_DURATION).toISOString(),
    last_confirmed_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString()
  };

  const { data: existing, error } = await supabase
    .from('incidents')
    .select('id, status, close_reason, closed_at, expires_at')
    .eq('source', IncidentSource.CEMADEN)
    .eq('external_id', externalId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!existing) {
    const { error: insertError } = await supabase.from('incidents').insert({
      ...fields,
      type: IncidentType.ALAGAMENTO,
      source: IncidentSource.CEMADEN,
      effect: IncidentEffect.RISCO,
      external_id: externalId,
      lat: sector.center.lat,
      lng: sector.center.lng,
      radius: Math.max(MIN_RADIUS, sector.radius + MARGIN),
      geometry: sector.geometry
    });
    if (insertError) throw new Error(insertError.message);
    return true;
  }

  const closed = existing.status === 'ENCERRADA';
  const expired = !closed && !!existing.expires_at && Date.parse(existing.expires_at) <= now;
  if (closed || expired) {
    const wait = existing.close_reason === 'CENTRAL' ? REOPEN_AFTER_CENTRAL : REOPEN_AFTER_CREWS;
    if (closed && existing.closed_at && now - Date.parse(existing.closed_at) < wait) return false;
    // Volta como alerta novo: os "não está lá" antigos não contam mais
    await supabase.from('incident_votes').delete().eq('incident_id', existing.id);
    const { error: reopenError } = await supabase
      .from('incidents')
      .update({ ...fields, status: 'ATIVA', created_at: new Date(now).toISOString(), closed_at: null, closed_by: null, close_reason: null })
      .eq('id', existing.id);
    if (reopenError) throw new Error(reopenError.message);
    return true;
  }

  const { error: updateError } = await supabase.from('incidents').update(fields).eq('id', existing.id);
  if (updateError) throw new Error(updateError.message);
  return true;
}
