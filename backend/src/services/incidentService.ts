import { supabase } from '../config/supabase';
import { AuthUser } from '../middleware/auth';
import { Coordinates, Incident, IncidentEffect, IncidentSource, IncidentType, IncidentVote, UserRole } from '../types';
import { distanceMeters } from './geo';
import { tomtomActiveIncidents } from './official/tomtom';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export class IncidentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface Defaults {
  effect: IncidentEffect;
  radius: number; // metros
  duration: number; // ms
}

// Relato da equipe (modelo Waze): vale como risco ou aviso até outra equipe confirmar.
// A central só acompanha: quem marca, confirma e tira do mapa são as equipes, as fontes oficiais e o vencimento.
export const CREW_DEFAULTS: Partial<Record<IncidentType, Defaults>> = {
  [IncidentType.ALAGAMENTO]: { effect: IncidentEffect.RISCO, radius: 150, duration: 2 * HOUR },
  [IncidentType.VIA_BLOQUEADA]: { effect: IncidentEffect.RISCO, radius: 100, duration: 2 * HOUR },
  [IncidentType.QUEDA_ARVORE]: { effect: IncidentEffect.RISCO, radius: 100, duration: 6 * HOUR },
  [IncidentType.ACIDENTE]: { effect: IncidentEffect.RISCO, radius: 100, duration: HOUR },
  [IncidentType.OBRAS]: { effect: IncidentEffect.RISCO, radius: 100, duration: 24 * HOUR },
  [IncidentType.CONGESTIONAMENTO]: { effect: IncidentEffect.RISCO, radius: 300, duration: HOUR },
  [IncidentType.PERIGO_NA_VIA]: { effect: IncidentEffect.AVISO, radius: 50, duration: 6 * HOUR },
  [IncidentType.VEICULO_PARADO]: { effect: IncidentEffect.AVISO, radius: 50, duration: HOUR },
  [IncidentType.SEMAFORO_QUEBRADO]: { effect: IncidentEffect.AVISO, radius: 50, duration: 6 * HOUR }
};

// Relato destes tipos confirmado por outra equipe passa a bloquear a via
const BLOCKS_WHEN_CONFIRMED = new Set([IncidentType.ALAGAMENTO, IncidentType.VIA_BLOQUEADA]);

// Relatos das equipes, alertas automáticos e marcações antigas da central somem com dois "não está lá"
const CLOSED_BY_CREWS = new Set([IncidentSource.EQUIPE, IncidentSource.CEMADEN, IncidentSource.CENTRAL]);
const NEGATIVE_VOTES_TO_CLOSE = 2;

// Relato do mesmo tipo a esta distância de outro ativo conta como confirmação dele
const MERGE_DISTANCE = 150; // metros
const REPORT_INTERVAL = MINUTE;
const MAX_REPORT_AGE = 6 * HOUR; // relato guardado no celular sem sinal
const MAX_NOTE_LENGTH = 280;

const SELECT = [
  '*',
  'creator:profiles!created_by(id, full_name)',
  'ambulance:ambulances!ambulance_id(id, code)',
  'incident_votes(user_id, ambulance_id, vote, voted_at)'
].join(', ');

const iso = (ms: number) => new Date(ms).toISOString();

// Ativa = não encerrada e dentro da validade (o vencimento é calculado na leitura)
const notExpired = () => `expires_at.is.null,expires_at.gt.${iso(Date.now())}`;

function toIncident(row: any, viewerId?: string): Incident {
  const votes: any[] = row.incident_votes ?? [];
  const since = Date.parse(row.last_confirmed_at ?? row.created_at);
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    effect: row.effect,
    location: { lat: row.lat, lng: row.lng },
    radius: row.radius,
    description: row.description,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastConfirmedAt: row.last_confirmed_at,
    createdBy: row.creator ? { id: row.creator.id, name: row.creator.full_name } : null,
    ambulance: row.ambulance ? { id: row.ambulance.id, code: row.ambulance.code } : null,
    geometry: row.geometry ?? null,
    votes: {
      yes: votes.filter(v => v.vote === IncidentVote.SIM).length,
      no: votes.filter(v => v.vote !== IncidentVote.SIM && Date.parse(v.voted_at) > since).length
    },
    myVote: viewerId ? votes.find(v => v.user_id === viewerId)?.vote ?? null : null
  };
}

export async function listActiveIncidents(viewerId?: string): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('incidents')
    .select(SELECT)
    .eq('status', 'ATIVA')
    .or(notExpired())
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  // Os do TomTom vêm da memória (trânsito ao vivo), depois dos do banco
  return [...(data ?? []).map(row => toIncident(row, viewerId)), ...tomtomActiveIncidents()];
}

// Só as do banco: o contador "Ocorrências" fala das equipes e dos alertas, não do trânsito
export async function countActiveIncidents(): Promise<number> {
  const { count, error } = await supabase
    .from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ATIVA')
    .or(notExpired());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function getActiveRow(id: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('incidents')
    .select(SELECT)
    .eq('id', id)
    .eq('status', 'ATIVA')
    .or(notExpired())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function ambulanceOnShift(userId: string): Promise<string | null> {
  const { data } = await supabase.from('ambulances').select('id').eq('driver_id', userId).maybeSingle();
  return data?.id ?? null;
}

async function closeRow(id: string, closedBy: string | null, reason: string): Promise<boolean> {
  const now = iso(Date.now());
  const { data, error } = await supabase
    .from('incidents')
    .update({ status: 'ENCERRADA', closed_at: now, closed_by: closedBy, close_reason: reason, updated_at: now })
    .eq('id', id)
    .eq('status', 'ATIVA')
    .select('id');

  if (error) throw new Error(error.message);
  return !!data?.length;
}

// ============================================
// CRIAÇÃO
// ============================================

export interface CreateIncidentInput {
  type?: unknown;
  lat?: unknown;
  lng?: unknown;
  description?: unknown;
  clientId?: unknown; // relato da equipe: id gerado no celular (reenvio sem duplicar)
  reportedAt?: unknown; // relato da equipe: hora em que foi feito (pode ter ficado na fila sem sinal)
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function parseNote(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new IncidentError(400, 'Observação inválida.');
  const note = value.trim();
  if (note.length > MAX_NOTE_LENGTH) throw new IncidentError(400, `A observação pode ter no máximo ${MAX_NOTE_LENGTH} caracteres.`);
  return note || null;
}

// created: entrou agora; merged: confirmou uma que já existia ali; nenhum dos dois: reenvio de um relato já recebido
export interface CreateIncidentResult {
  incident: Incident;
  created: boolean;
  merged: boolean;
}

export async function createIncident(user: AuthUser, input: CreateIncidentInput): Promise<CreateIncidentResult> {
  const { lat, lng } = input;
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new IncidentError(400, 'Local inválido.');
  }
  if (user.role !== UserRole.MOTORISTA) throw new IncidentError(403, 'Só as equipes relatam ocorrências.');

  return createCrewReport(user, input, { lat, lng }, parseNote(input.description));
}

async function insertIncident(fields: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.from('incidents').insert(fields).select(SELECT).single();
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
}

async function createCrewReport(
  user: AuthUser,
  input: CreateIncidentInput,
  location: Coordinates,
  description: string | null
): Promise<CreateIncidentResult> {
  const type = input.type as IncidentType;
  const defaults = CREW_DEFAULTS[type];
  if (!defaults) throw new IncidentError(400, 'Tipo de relato inválido.');

  const ambulanceId = await ambulanceOnShift(user.id);
  if (!ambulanceId) throw new IncidentError(403, 'Inicie o turno para relatar ocorrências.');

  const clientId = typeof input.clientId === 'string' && input.clientId.length <= 64 ? input.clientId : null;
  const findSent = async () => {
    if (!clientId) return null;
    const { data } = await supabase.from('incidents').select(SELECT).eq('created_by', user.id).eq('client_id', clientId).maybeSingle();
    return data;
  };

  // Reenvio da fila do celular: o relato já chegou antes
  const sent = await findSent();
  if (sent) return { incident: toIncident(sent, user.id), created: false, merged: false };

  const now = Date.now();
  let reportedAt = typeof input.reportedAt === 'string' ? Date.parse(input.reportedAt) : now;
  if (!Number.isFinite(reportedAt) || reportedAt > now) reportedAt = now;
  if (now - reportedAt > MAX_REPORT_AGE || reportedAt + defaults.duration <= now) {
    throw new IncidentError(410, 'O relato ficou antigo demais sem sinal e não foi enviado.');
  }

  // Mesmo tipo já marcado ali perto por outra equipe (ou pela central, antes): o relato confirma o que existe.
  // Área automática (CEMADEN) é grande demais para isso: o relato no ponto exato fica separado.
  const nearby = (await listActiveIncidents(user.id)).find(incident =>
    incident.type === type &&
    (incident.source === IncidentSource.CENTRAL || incident.source === IncidentSource.EQUIPE) &&
    distanceMeters(incident.location, location) <= Math.max(incident.radius, MERGE_DISTANCE)
  );
  if (nearby) {
    const { incident } = await voteIncident(user, nearby.id, IncidentVote.SIM);
    if (incident) return { incident, created: false, merged: true };
  }

  // Um relato por minuto, como no Waze (vale a hora em que foi feito, não a do envio)
  const { count } = await supabase
    .from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gt('created_at', iso(reportedAt - REPORT_INTERVAL))
    .lt('created_at', iso(reportedAt + REPORT_INTERVAL));
  if (count) throw new IncidentError(429, 'Aguarde um minuto para relatar de novo.');

  try {
    const row = await insertIncident({
      type,
      source: IncidentSource.EQUIPE,
      effect: defaults.effect,
      lat: location.lat,
      lng: location.lng,
      radius: defaults.radius,
      description,
      created_by: user.id,
      ambulance_id: ambulanceId,
      client_id: clientId,
      created_at: iso(reportedAt),
      last_confirmed_at: iso(reportedAt),
      expires_at: iso(reportedAt + defaults.duration)
    });
    return { incident: toIncident(row, user.id), created: true, merged: false };
  } catch (error: any) {
    // Dois envios do mesmo relato ao mesmo tempo: fica o primeiro
    const duplicate = error?.code === '23505' ? await findSent() : null;
    if (duplicate) return { incident: toIncident(duplicate, user.id), created: false, merged: false };
    throw error;
  }
}

// ============================================
// CONFIRMAÇÃO E ENCERRAMENTO
// ============================================

export async function voteIncident(
  user: AuthUser,
  id: string,
  vote: IncidentVote
): Promise<{ incident: Incident | null; closed: boolean }> {
  if (!Object.values(IncidentVote).includes(vote)) throw new IncidentError(400, 'Resposta inválida.');

  const row = await getActiveRow(id);
  if (!row) throw new IncidentError(404, 'Esta ocorrência já foi encerrada.');

  const ambulanceId = await ambulanceOnShift(user.id);
  if (!ambulanceId) throw new IncidentError(403, 'Inicie o turno para confirmar ocorrências.');

  const now = Date.now();
  const { error } = await supabase
    .from('incident_votes')
    .upsert({ incident_id: id, user_id: user.id, ambulance_id: ambulanceId, vote, voted_at: iso(now) }, { onConflict: 'incident_id,user_id' });
  if (error) throw new Error(error.message);

  if (vote === IncidentVote.SIM) {
    const updates: Record<string, unknown> = { last_confirmed_at: iso(now), updated_at: iso(now) };

    // Confirmação renova a validade; as fontes oficiais seguem o prazo da própria fonte
    const renewal = CREW_DEFAULTS[row.type as IncidentType]?.duration;
    const manual = row.source === IncidentSource.CENTRAL || row.source === IncidentSource.EQUIPE;
    if (manual && row.expires_at && renewal) {
      updates.expires_at = iso(Math.max(Date.parse(row.expires_at), now + renewal));
    }

    const fromAnotherCrew = ambulanceId !== row.ambulance_id && user.id !== row.created_by;
    if (
      row.source === IncidentSource.EQUIPE &&
      row.effect === IncidentEffect.RISCO &&
      BLOCKS_WHEN_CONFIRMED.has(row.type) &&
      fromAnotherCrew
    ) {
      updates.effect = IncidentEffect.BLOQUEIO;
    }

    const { data, error: updateError } = await supabase.from('incidents').update(updates).eq('id', id).select(SELECT).single();
    if (updateError) throw new Error(updateError.message);
    return { incident: toIncident(data, user.id), closed: false };
  }

  // Quem relatou desfaz o próprio relato na hora
  if (vote === IncidentVote.NAO && row.created_by === user.id) {
    await closeRow(id, user.id, 'RETIRADA');
    return { incident: null, closed: true };
  }

  if (CLOSED_BY_CREWS.has(row.source)) {
    const since = Date.parse(row.last_confirmed_at ?? row.created_at);
    const { data: votes, error: votesError } = await supabase
      .from('incident_votes')
      .select('user_id, ambulance_id, voted_at')
      .eq('incident_id', id)
      .in('vote', [IncidentVote.NAO, IncidentVote.PASSOU]);
    if (votesError) throw new Error(votesError.message);

    // Viaturas diferentes, depois da última confirmação
    const crews = new Set((votes ?? []).filter(v => Date.parse(v.voted_at) > since).map(v => v.ambulance_id ?? v.user_id));
    if (crews.size >= NEGATIVE_VOTES_TO_CLOSE) {
      await closeRow(id, null, vote === IncidentVote.PASSOU ? 'VIATURAS_PASSARAM' : 'NAO_ESTA_LA');
      return { incident: null, closed: true };
    }
  }

  const updated = await getActiveRow(id);
  return { incident: updated ? toIncident(updated, user.id) : null, closed: !updated };
}

// Viatura passando normalmente pela área de um relato de equipe (modelo Waze): conta como "não está mais lá"
const PASSING_SPEED = 3; // m/s (~11 km/h): parada ou em marcha lenta não conta

export async function registerPassage(user: AuthUser, ambulanceId: string, position: Coordinates, speed: number | null): Promise<void> {
  if (speed === null || speed < PASSING_SPEED) return;

  const passed = (await listActiveIncidents(user.id)).filter(incident =>
    incident.source === IncidentSource.EQUIPE &&
    !incident.myVote &&
    incident.ambulance?.id !== ambulanceId &&
    incident.createdBy?.id !== user.id &&
    distanceMeters(position, incident.location) <= incident.radius
  );
  for (const incident of passed) await voteIncident(user, incident.id, IncidentVote.PASSOU);
}
