import { CallOutcome, CallPriority, CallStatus } from '../types';
import { CallError } from './calls';

// Filtros da gestão (período, histórico e mapa de calor) vindos da URL. Sem Supabase: dá para testar.

export const DEFAULT_PERIOD_DAYS = 30;
export const MAX_PERIOD_DAYS = 366;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
const MAX_SEARCH = 100;
const MAX_WORDS = 5;
const DAY_MS = 24 * 60 * 60_000;

type Query = Record<string, unknown>;

export interface Period {
  from: string;
  to: string;
}

export interface HistoryQuery {
  period: Period;
  includeDemo: boolean;
  search: string | null; // filtro do PostgREST para o .or()
  priority: CallPriority | null;
  status: CallStatus | null;
  outcome: CallOutcome | null;
  ambulanceId: string | null;
  hospitalId: string | null;
  oldestFirst: boolean; // ?order=asc: dos mais antigos para os mais novos
  page: number;
  pageSize: number;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// De `from` a `to` (ISO); sem eles, os últimos 30 dias. No máximo 1 ano.
export function parsePeriod(query: Query, now = Date.now()): Period {
  const to = text(query.to) ? Date.parse(text(query.to)) : now;
  const from = text(query.from) ? Date.parse(text(query.from)) : to - DEFAULT_PERIOD_DAYS * DAY_MS;
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new CallError(400, 'Período inválido.');
  if (from >= to) throw new CallError(400, 'O início do período precisa ser antes do fim.');
  if (to - from > MAX_PERIOD_DAYS * DAY_MS) throw new CallError(400, 'O período pode ter até 1 ano.');
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}

// Os chamados de demonstração só entram com demo=true
export const parseIncludeDemo = (query: Query) => text(query.demo) === 'true';

function oneOf<T extends string>(value: unknown, options: T[], label: string): T | null {
  const raw = text(value);
  if (!raw) return null;
  if (!(options as string[]).includes(raw)) throw new CallError(400, `${label} inválido.`);
  return raw as T;
}

export const parsePriorityFilter = (value: unknown) => oneOf(value, Object.values(CallPriority), 'Classificação');

function identifier(value: unknown, label: string): string | null {
  const raw = text(value);
  if (!raw) return null;
  if (!/^[\w-]{1,64}$/.test(raw)) throw new CallError(400, `${label} inválido.`);
  return raw;
}

function integer(value: unknown, fallback: number, min: number, max: number, label: string): number {
  const raw = text(value);
  if (!raw) return fallback;
  const number = Number(raw);
  if (!Number.isInteger(number) || number < min || number > max) throw new CallError(400, `${label} inválido.`);
  return number;
}

const SEARCH_COLUMNS = ['address', 'description', 'reference_point'];

// Letras que podem vir com acento viram o grupo com as variantes: "hortencia" acha "Hortência"
// (maiúsculas acentuadas junto: o ~* do banco nem sempre iguala "É" e "é")
const ACCENTS: Record<string, string> = {
  a: 'aáàâãÁÀÂÃ',
  e: 'eéêÉÊ',
  i: 'iíÍ',
  o: 'oóôõÓÔÕ',
  u: 'uúüÚÜ',
  c: 'cçÇ'
};

export function accentPattern(word: string): string {
  return [...word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()]
    .map(char => (ACCENTS[char] ? `[${ACCENTS[char]}]` : char))
    .join('');
}

/**
 * Busca do histórico como filtro `or` do PostgREST:
 * - id do chamado (call-… ou demo-…): só ele;
 * - telefone (8 dígitos ou mais, com ou sem máscara): parte do número de quem ligou;
 * - texto: cada palavra precisa aparecer no endereço, na descrição ou na referência, com ou sem acento.
 * Das palavras só ficam letras e números: nada que o filtro ou a expressão regular interpretariam.
 */
export function searchFilter(input: string): string | null {
  const term = input.trim().slice(0, MAX_SEARCH);
  if (!term) return null;
  if (/^(call|demo)-[\w-]+$/i.test(term)) return `id.eq.${term}`;

  const digits = term.replace(/\D/g, '');
  if (digits.length >= 8 && /^[\d\s()+.-]+$/.test(term)) return `caller_phone.like.*${digits}*`;

  const words = term
    .split(/[^\p{L}\p{N}]+/u)
    .filter(word => word.length >= 2)
    .slice(0, MAX_WORDS);
  if (words.length === 0) return null;
  const anyColumn = (word: string) => SEARCH_COLUMNS.map(column => `${column}.imatch."${accentPattern(word)}"`).join(',');
  return words.length === 1 ? anyColumn(words[0]) : `and(${words.map(word => `or(${anyColumn(word)})`).join(',')})`;
}

export function parseHistoryQuery(query: Query, now = Date.now()): HistoryQuery {
  return {
    period: parsePeriod(query, now),
    includeDemo: parseIncludeDemo(query),
    search: searchFilter(text(query.q)),
    priority: parsePriorityFilter(query.priority),
    status: oneOf(query.status, Object.values(CallStatus), 'Status'),
    outcome: oneOf(query.outcome, Object.values(CallOutcome), 'Desfecho'),
    ambulanceId: identifier(query.ambulance, 'Viatura'),
    hospitalId: identifier(query.hospital, 'Hospital'),
    oldestFirst: oneOf(query.order, ['asc', 'desc'], 'Critério de ordem') === 'asc',
    page: integer(query.page, 1, 1, 10_000, 'Página'),
    pageSize: integer(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE, 'Tamanho da página')
  };
}
