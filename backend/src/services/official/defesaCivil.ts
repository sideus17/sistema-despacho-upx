import axios from 'axios';
import { StringDecoder } from 'node:string_decoder';
import { supabase } from '../../config/supabase';
import { IncidentEffect, IncidentSource, IncidentType } from '../../types';
import { CapAlert, SOROCABA_CENTER, parseEntry } from './capParser';

// Feed CAP 1.2 da Defesa Civil (IDAP/MIDR): todos os alertas do país, ~15 MB, lido por partes
const feedUrl = () => process.env.DEFESA_CIVIL_CAP_URL || 'https://idapfile.mdr.gov.br/idap/api/rss/cap';

// Lê o feed inteiro sem guardar tudo na memória: um alerta (<entry>) por vez
async function readFeed(onEntry: (xml: string) => void): Promise<void> {
  const response = await axios.get(feedUrl(), {
    responseType: 'stream',
    timeout: 60000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; samu-despacho-academico)' }
  });
  const decoder = new StringDecoder('utf8');
  // Junta os pedaços só quando um alerta termina: somar texto a cada pedaço recopiaria alertas de vários MB
  let parts: string[] = [];
  let tail = '';
  for await (const chunk of response.data) {
    const text = decoder.write(chunk);
    parts.push(text);
    const closes = (tail + text).includes('</entry>');
    tail = text.slice(-('</entry>'.length - 1));
    if (!closes) continue;

    let buffer = parts.join('');
    let end: number;
    while ((end = buffer.indexOf('</entry>')) !== -1) {
      onEntry(buffer.slice(0, end));
      buffer = buffer.slice(end + '</entry>'.length);
    }
    parts = [buffer];
  }
}

const MAX_DESCRIPTION = 280;

function describe(alert: CapAlert): string {
  const text = alert.headline ? `${alert.event}: ${alert.headline}` : alert.event;
  return text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION - 1)}…` : text;
}

export interface DefesaCivilResult {
  alerts: number; // alertas no feed (país)
  active: number; // valendo para Sorocaba
}

export async function refreshDefesaCivil(): Promise<DefesaCivilResult> {
  const covering = new Map<string, CapAlert>();
  const replaced = new Map<string, 'CANCELADO' | 'ATUALIZADO'>();
  let total = 0;
  const now = Date.now();

  await readFeed(xml => {
    const alert = parseEntry(xml);
    if (!alert) return;
    total++;
    if (alert.status !== 'Actual') return;

    for (const reference of alert.references) replaced.set(reference, alert.msgType === 'Cancel' ? 'CANCELADO' : 'ATUALIZADO');
    if (alert.msgType === 'Cancel' || !alert.coversSorocaba) return;
    if (alert.expires && Date.parse(alert.expires) <= now) return;
    covering.set(alert.identifier, alert);
  });
  for (const identifier of replaced.keys()) covering.delete(identifier);

  // O feed foi lido inteiro: agora dá para sincronizar, inclusive encerrar o que saiu dele
  const { data: rows, error } = await supabase
    .from('incidents')
    .select('id, external_id, status')
    .eq('source', IncidentSource.DEFESA_CIVIL);
  if (error) throw new Error(error.message);
  const known = new Map((rows ?? []).map(row => [row.external_id as string, row]));

  for (const alert of covering.values()) {
    const fields = {
      description: describe(alert),
      expires_at: alert.expires ? new Date(alert.expires).toISOString() : null,
      updated_at: new Date(now).toISOString()
    };
    const row = known.get(alert.identifier);
    if (row) {
      // Encerrado pela central fica encerrado
      if (row.status === 'ATIVA') await supabase.from('incidents').update(fields).eq('id', row.id);
      continue;
    }
    const { error: insertError } = await supabase.from('incidents').insert({
      ...fields,
      type: IncidentType.ALERTA_OFICIAL,
      source: IncidentSource.DEFESA_CIVIL,
      effect: IncidentEffect.AVISO,
      external_id: alert.identifier,
      lat: SOROCABA_CENTER.lat,
      lng: SOROCABA_CENTER.lng,
      radius: 0,
      created_at: new Date(alert.sent).toISOString(),
      last_confirmed_at: new Date(alert.sent).toISOString()
    });
    if (insertError) throw new Error(insertError.message);
  }

  for (const row of rows ?? []) {
    if (row.status !== 'ATIVA' || covering.has(row.external_id)) continue;
    await supabase
      .from('incidents')
      .update({
        status: 'ENCERRADA',
        closed_at: new Date(now).toISOString(),
        close_reason: replaced.get(row.external_id) ?? 'FORA_DO_FEED',
        updated_at: new Date(now).toISOString()
      })
      .eq('id', row.id);
  }

  return { alerts: total, active: covering.size };
}
