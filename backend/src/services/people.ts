import { CallStatus } from '../types';
import { CallRow } from './calls';
import { DurationStats, durationStats, secondsBetween } from './indicators';

// Indicadores por pessoa: quem registrou, regulou e despachou (atendentes) e quem dirigiu (motoristas).
// Saem das colunas de autor dos chamados (migração 008). Sem Supabase: dá para testar.

export const PEOPLE_COLUMNS =
  'status, timestamp, priority, initial_priority, created_by, regulated_at, regulated_by, dispatched_at, dispatched_by, driver_id, en_route_at, on_scene_at';

export type PeopleRow = Pick<
  CallRow,
  | 'status'
  | 'timestamp'
  | 'priority'
  | 'initial_priority'
  | 'created_by'
  | 'regulated_at'
  | 'regulated_by'
  | 'dispatched_at'
  | 'dispatched_by'
  | 'driver_id'
  | 'en_route_at'
  | 'on_scene_at'
>;

// Nome de cada id (contas reais e a equipe da demonstração)
export type PeopleNames = Map<string, { name: string; demo: boolean }>;

export interface AttendantStats {
  id: string;
  name: string;
  demo: boolean;
  opened: number; // chamados registrados
  regulated: number;
  dispatched: number;
  closedWithoutDispatch: number; // regulados e encerrados sem viatura (orientação ou cancelamento)
  reclassified: number; // regulados com a cor diferente da do registro
  regulation: DurationStats; // abertura → regulação, nos que a pessoa regulou
  dispatch: DurationStats; // regulação → despacho, nos que a pessoa despachou
}

export interface DriverStats {
  id: string;
  name: string;
  demo: boolean;
  attended: number;
  departure: DurationStats; // despacho → saída da viatura
  arrival: DurationStats; // despacho → chegada ao local
}

export interface PeopleIndicators {
  attendants: AttendantStats[];
  drivers: DriverStats[];
  unattributed: number; // chamados sem autor (abertos antes da etapa 6)
}

export const REMOVED_ACCOUNT = 'Conta removida';

const CLOSED_AT_REGULATION = [CallStatus.ORIENTADO, CallStatus.CANCELADO];

export function computePeople(rows: PeopleRow[], names: PeopleNames): PeopleIndicators {
  const attendants = new Map<string, { counts: Omit<AttendantStats, 'id' | 'name' | 'demo' | 'regulation' | 'dispatch'>; regulation: number[]; dispatch: number[] }>();
  const drivers = new Map<string, { attended: number; departure: number[]; arrival: number[] }>();
  let unattributed = 0;

  const attendant = (id: string) => {
    let entry = attendants.get(id);
    if (!entry) {
      entry = { counts: { opened: 0, regulated: 0, dispatched: 0, closedWithoutDispatch: 0, reclassified: 0 }, regulation: [], dispatch: [] };
      attendants.set(id, entry);
    }
    return entry;
  };
  const push = (values: number[], value: number | null) => {
    if (value !== null) values.push(value);
  };

  for (const row of rows) {
    if (!row.created_by) unattributed++;
    else attendant(row.created_by).counts.opened++;

    if (row.regulated_by) {
      const entry = attendant(row.regulated_by);
      entry.counts.regulated++;
      if (CLOSED_AT_REGULATION.includes(row.status) && !row.dispatched_at) entry.counts.closedWithoutDispatch++;
      if (row.initial_priority && row.initial_priority !== row.priority) entry.counts.reclassified++;
      push(entry.regulation, secondsBetween(row.timestamp, row.regulated_at));
    }

    if (row.dispatched_by) {
      const entry = attendant(row.dispatched_by);
      entry.counts.dispatched++;
      push(entry.dispatch, secondsBetween(row.regulated_at, row.dispatched_at));
    }

    if (row.driver_id) {
      const entry = drivers.get(row.driver_id) ?? { attended: 0, departure: [], arrival: [] };
      entry.attended++;
      // Saída e chegada no mesmo instante: o GPS só marcou a chegada (como nos indicadores gerais)
      if (!(row.en_route_at && row.en_route_at === row.on_scene_at)) push(entry.departure, secondsBetween(row.dispatched_at, row.en_route_at));
      push(entry.arrival, secondsBetween(row.dispatched_at, row.on_scene_at));
      drivers.set(row.driver_id, entry);
    }
  }

  const identity = (id: string) => {
    const known = names.get(id);
    return { id, name: known?.name ?? REMOVED_ACCOUNT, demo: known?.demo ?? false };
  };
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'pt-BR');

  return {
    attendants: [...attendants]
      .map(([id, entry]): AttendantStats => ({
        ...identity(id),
        ...entry.counts,
        regulation: durationStats(entry.regulation),
        dispatch: durationStats(entry.dispatch)
      }))
      .sort((a, b) => b.opened + b.regulated + b.dispatched - (a.opened + a.regulated + a.dispatched) || byName(a, b)),
    drivers: [...drivers]
      .map(([id, entry]): DriverStats => ({
        ...identity(id),
        attended: entry.attended,
        departure: durationStats(entry.departure),
        arrival: durationStats(entry.arrival)
      }))
      .sort((a, b) => b.attended - a.attended || byName(a, b)),
    unattributed
  };
}
