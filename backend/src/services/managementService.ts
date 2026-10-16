import { supabase } from '../config/supabase';
import { CallPriority, CallStatus } from '../types';
import { CallRow } from './calls';
import { HistoryQuery, Period } from './history';
import { INDICATOR_COLUMNS, IndicatorRow } from './indicators';

// Leituras da gestão. O Supabase devolve no máximo 1000 linhas por vez: as buscas grandes vão em páginas.

const PAGE = 1000;
const MAX_INDICATOR_ROWS = 50_000;
export const MAX_HEAT_POINTS = 5000;

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function fetchAll<T>(page: (from: number, to: number) => Page<T>, max: number): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await page(from, Math.min(from + PAGE, max) - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: rows.length >= max };
}

// Chamados abertos no período (ordem fixa: as páginas não pulam nem repetem linhas)
function callsInPeriod(columns: string, period: Period, includeDemo: boolean) {
  const query = supabase.from('calls').select(columns).gte('timestamp', period.from).lt('timestamp', period.to);
  return includeDemo ? query : query.eq('demo', false);
}

export async function indicatorRows(period: Period, includeDemo: boolean) {
  return fetchAll<IndicatorRow>(
    (from, to) =>
      callsInPeriod(INDICATOR_COLUMNS, period, includeDemo)
        .order('timestamp', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to) as unknown as Page<IndicatorRow>,
    MAX_INDICATOR_ROWS
  );
}

// Uma página do histórico, dos mais novos para os mais antigos, com o total que bate com os filtros
export async function historyPage(query: HistoryQuery): Promise<{ rows: CallRow[]; total: number }> {
  const filtered = (columns: string, head = false) => {
    let request = supabase
      .from('calls')
      .select(columns, { count: 'exact', head })
      .gte('timestamp', query.period.from)
      .lt('timestamp', query.period.to);
    if (!query.includeDemo) request = request.eq('demo', false);
    if (query.priority) request = request.eq('priority', query.priority);
    if (query.status) request = request.eq('status', query.status);
    if (query.outcome) request = request.eq('outcome', query.outcome);
    if (query.ambulanceId) request = request.eq('ambulance_id', query.ambulanceId);
    if (query.hospitalId) request = request.eq('hospital_id', query.hospitalId);
    return query.search ? request.or(query.search) : request;
  };

  const start = (query.page - 1) * query.pageSize;
  const { data, error, count } = await filtered('*')
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .range(start, start + query.pageSize - 1);
  if (!error) return { rows: (data ?? []) as unknown as CallRow[], total: count ?? 0 };
  // Página depois da última (o PostgREST responde 416): vazia, mas com o total
  if (error.code !== 'PGRST103') throw new Error(error.message);
  const { count: total, error: countError } = await filtered('id', true);
  if (countError) throw new Error(countError.message);
  return { rows: [], total: total ?? 0 };
}

export type HeatPoint = [number, number, CallPriority];

// Onde os chamados aconteceram (cancelados ficam de fora), os mais recentes primeiro
export async function heatPoints(period: Period, includeDemo: boolean, priority: CallPriority | null) {
  type Row = { lat: number; lng: number; priority: CallPriority };
  const { rows, truncated } = await fetchAll<Row>((from, to) => {
    let query = callsInPeriod('lat, lng, priority', period, includeDemo).neq('status', CallStatus.CANCELADO);
    if (priority) query = query.eq('priority', priority);
    return query
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to) as unknown as Page<Row>;
  }, MAX_HEAT_POINTS);
  const round = (value: number) => Math.round(value * 1e5) / 1e5;
  return { points: rows.map((row): HeatPoint => [round(row.lat), round(row.lng), row.priority]), truncated };
}
