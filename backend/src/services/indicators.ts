import { CallOutcome, CallPriority, CallStatus } from '../types';
import { CallRow } from './calls';

// Indicadores da gestão a partir dos horários de cada chamado. Sem Supabase: dá para testar.

// Meta de tempo-resposta (da abertura do chamado à chegada ao local), em minutos, por cor
export const RESPONSE_TARGETS: Record<CallPriority, number> = {
  [CallPriority.EMERGENCIA]: 10,
  [CallPriority.URGENTE]: 20,
  [CallPriority.PRIORITARIO]: 30,
  [CallPriority.NAO_URGENTE]: 60
};

// O banco grava em UTC; hora do dia e dia são os de Sorocaba
export const TIME_ZONE = 'America/Sao_Paulo';

// Só as colunas que os indicadores usam (a busca traz milhares de linhas)
export const INDICATOR_COLUMNS =
  'id, priority, status, timestamp, ambulance_id, regulated_at, dispatched_at, en_route_at, on_scene_at, left_scene_at, hospital_arrival_at, finished_at, hospital_id, outcome';

export type IndicatorRow = Pick<
  CallRow,
  | 'priority'
  | 'status'
  | 'timestamp'
  | 'ambulance_id'
  | 'regulated_at'
  | 'dispatched_at'
  | 'en_route_at'
  | 'on_scene_at'
  | 'left_scene_at'
  | 'hospital_arrival_at'
  | 'finished_at'
  | 'hospital_id'
  | 'outcome'
>;

// Tempos em segundos; sem nenhum chamado com os dois horários, a mediana fica nula
export interface DurationStats {
  n: number;
  median: number | null;
  p90: number | null;
}

export interface ResponseStats extends DurationStats {
  withinTarget: number | null; // fração (0 a 1) que chegou dentro da meta da própria cor
}

export interface TargetStats extends ResponseStats {
  target: number; // segundos
}

// Etapas: regulação (abertura → regulação), espera pela viatura (regulação → despacho), fila inteira
// (abertura → despacho, comparável com os chamados de antes da regulação), saída, deslocamento,
// tempo-resposta, no local, transporte e total
export type Stage =
  | 'regulation'
  | 'dispatchWait'
  | 'queue'
  | 'departure'
  | 'travel'
  | 'response'
  | 'onScene'
  | 'transport'
  | 'total';

export interface Indicators {
  total: number;
  byStatus: Record<CallStatus, number>;
  byPriority: Record<CallPriority, number>;
  stages: Record<Stage, DurationStats>;
  response: { overall: ResponseStats; byPriority: Record<CallPriority, TargetStats> };
  byOutcome: Record<CallOutcome, number>;
  byHospital: Array<{ hospitalId: string; count: number; transportMedian: number | null }>;
  byAmbulance: Array<{ ambulanceId: string; count: number; responseMedian: number | null }>;
  byHour: number[]; // 0 a 23
  // Todos os dias do período, com zero; as medianas e a fração na meta do dia ficam nulas sem casos (minigráficos)
  byDay: Array<{ date: string; count: number; responseMedian: number | null; withinTarget: number | null; queueMedian: number | null }>;
  quality: {
    finished: number;
    missingOnScene: number; // finalizados sem a chegada ao local (GPS desligado ou chamado antigo)
    missingOutcome: number; // finalizados sem desfecho (antes da etapa 4)
  };
}

const PRIORITIES = Object.values(CallPriority);
const STATUSES = Object.values(CallStatus);
const OUTCOMES = Object.values(CallOutcome);
const STAGES: Stage[] = ['regulation', 'dispatchWait', 'queue', 'departure', 'travel', 'response', 'onScene', 'transport', 'total'];

const zeros = <K extends string>(keys: K[]) => Object.fromEntries(keys.map(key => [key, 0])) as Record<K, number>;

// Percentil com interpolação entre os vizinhos (p = 0,5 é a mediana); a lista vem ordenada
export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return Math.round(sorted[low] + (sorted[high] - sorted[low]) * (index - low));
}

export function durationStats(values: number[]): DurationStats {
  const sorted = [...values].sort((a, b) => a - b);
  return { n: sorted.length, median: percentile(sorted, 0.5), p90: percentile(sorted, 0.9) };
}

// Segundos entre dois horários; nulo se faltar um deles ou se estiverem fora de ordem (relógio errado)
export function secondsBetween(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;
  const seconds = (Date.parse(to) - Date.parse(from)) / 1000;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

const hourFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hourCycle: 'h23' });
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export const hourOf = (iso: string) => Number(hourFormat.formatToParts(new Date(iso)).find(part => part.type === 'hour')?.value) % 24;
export const dayOf = (iso: string) => dayFormat.format(new Date(iso)); // AAAA-MM-DD

const MAX_DAYS = 400;

// Dias de `from` a `to` (inclusive), no fuso de Sorocaba
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const last = dayOf(to);
  for (let day = dayOf(from); day <= last && days.length < MAX_DAYS; ) {
    days.push(day);
    const [year, month, date] = day.split('-').map(Number);
    day = new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
  }
  return days;
}

/**
 * Agrega os chamados do período. Cada tempo usa só os chamados que têm os dois horários:
 * - tempo-resposta é da abertura à chegada ao local, comparado com a meta da cor;
 * - com a saída e a chegada no mesmo instante (o GPS só marcou a chegada), saída e deslocamento ficam de fora;
 * - no local vai até a saída do local ou, sem transporte, até o fim do atendimento.
 */
export function computeIndicators(rows: IndicatorRow[], period: { from: string; to: string }): Indicators {
  const samples = Object.fromEntries(STAGES.map(stage => [stage, [] as number[]])) as Record<Stage, number[]>;
  const responseByPriority = Object.fromEntries(PRIORITIES.map(priority => [priority, [] as number[]])) as Record<CallPriority, number[]>;
  const byStatus = zeros(STATUSES);
  const byPriority = zeros(PRIORITIES);
  const byOutcome = zeros(OUTCOMES);
  const byHour = new Array<number>(24).fill(0);
  const byDay = new Map(daysBetween(period.from, period.to).map(day => [day, { count: 0, responses: [] as number[], within: 0, queues: [] as number[] }]));
  const hospitals = new Map<string, number[]>();
  const ambulances = new Map<string, { count: number; responses: number[] }>();
  const quality = { finished: 0, missingOnScene: 0, missingOutcome: 0 };
  let within = 0;

  const add = (stage: Stage, value: number | null) => {
    if (value !== null) samples[stage].push(value);
  };

  for (const row of rows) {
    if (byStatus[row.status] !== undefined) byStatus[row.status]++;
    if (byPriority[row.priority] !== undefined) byPriority[row.priority]++;
    byHour[hourOf(row.timestamp)]++;
    const day = byDay.get(dayOf(row.timestamp));
    if (day) day.count++;

    const finished = row.status === CallStatus.FINALIZADO;
    const gpsOnlyAtArrival = !!row.en_route_at && row.en_route_at === row.on_scene_at;
    const response = secondsBetween(row.timestamp, row.on_scene_at);

    add('regulation', secondsBetween(row.timestamp, row.regulated_at));
    add('dispatchWait', secondsBetween(row.regulated_at, row.dispatched_at));
    const queue = secondsBetween(row.timestamp, row.dispatched_at);
    add('queue', queue);
    if (!gpsOnlyAtArrival) {
      add('departure', secondsBetween(row.dispatched_at, row.en_route_at));
      add('travel', secondsBetween(row.en_route_at, row.on_scene_at));
    }
    add('response', response);
    const sceneEnd = row.left_scene_at ?? (finished && !row.hospital_arrival_at ? row.finished_at : null);
    add('onScene', secondsBetween(row.on_scene_at, sceneEnd));
    const transport = secondsBetween(row.left_scene_at, row.hospital_arrival_at);
    add('transport', transport);
    if (finished) add('total', secondsBetween(row.timestamp, row.finished_at));

    if (response !== null && responseByPriority[row.priority]) {
      responseByPriority[row.priority].push(response);
      const onTarget = response <= RESPONSE_TARGETS[row.priority] * 60;
      if (onTarget) within++;
      if (day) {
        day.responses.push(response);
        if (onTarget) day.within++;
      }
    }
    if (day && queue !== null) day.queues.push(queue);

    if (row.hospital_id && row.hospital_arrival_at) {
      // Chegada sem a saída do local registrada: conta o transporte, sem tempo
      hospitals.set(row.hospital_id, [...(hospitals.get(row.hospital_id) ?? []), transport ?? Number.NaN]);
    }

    if (row.ambulance_id) {
      const entry = ambulances.get(row.ambulance_id) ?? { count: 0, responses: [] };
      entry.count++;
      if (response !== null) entry.responses.push(response);
      ambulances.set(row.ambulance_id, entry);
    }

    if (finished) {
      quality.finished++;
      if (!row.on_scene_at) quality.missingOnScene++;
      if (row.outcome && byOutcome[row.outcome] !== undefined) byOutcome[row.outcome]++;
      else quality.missingOutcome++;
    }
  }

  const stages = Object.fromEntries(STAGES.map(stage => [stage, durationStats(samples[stage])])) as Record<Stage, DurationStats>;
  const withinShare = (values: number[], count: number) => (values.length > 0 ? count / values.length : null);

  return {
    total: rows.length,
    byStatus,
    byPriority,
    stages,
    response: {
      overall: { ...stages.response, withinTarget: withinShare(samples.response, within) },
      byPriority: Object.fromEntries(
        PRIORITIES.map(priority => {
          const values = responseByPriority[priority];
          const target = RESPONSE_TARGETS[priority] * 60;
          const count = values.filter(value => value <= target).length;
          return [priority, { ...durationStats(values), target, withinTarget: withinShare(values, count) }];
        })
      ) as Record<CallPriority, TargetStats>
    },
    byOutcome,
    byHospital: [...hospitals]
      .map(([hospitalId, values]) => {
        const times = values.filter(Number.isFinite);
        return { hospitalId, count: values.length, transportMedian: durationStats(times).median };
      })
      .sort((a, b) => b.count - a.count || a.hospitalId.localeCompare(b.hospitalId)),
    byAmbulance: [...ambulances]
      .map(([ambulanceId, entry]) => ({ ambulanceId, count: entry.count, responseMedian: durationStats(entry.responses).median }))
      .sort((a, b) => b.count - a.count || a.ambulanceId.localeCompare(b.ambulanceId)),
    byHour,
    byDay: [...byDay].map(([date, day]) => ({
      date,
      count: day.count,
      responseMedian: durationStats(day.responses).median,
      withinTarget: withinShare(day.responses, day.within),
      queueMedian: durationStats(day.queues).median
    })),
    quality
  };
}
