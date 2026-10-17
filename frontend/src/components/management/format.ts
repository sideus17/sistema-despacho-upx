import { AttendanceStage, CallPriority } from '../../types';

// Números e períodos da tela de gestão

// "8,5 min"; de 1 h para cima, "1 h 05 min"; sem valor, "—"
export function formatMinutes(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} min`;
  const whole = Math.round(minutes);
  return `${Math.floor(whole / 60)} h ${String(whole % 60).padStart(2, '0')} min`;
}

export const formatPercent = (fraction: number | null | undefined) =>
  fraction == null || !Number.isFinite(fraction) ? '—' : `${Math.round(fraction * 100)}%`;

export const formatCount = (value: number) => value.toLocaleString('pt-BR');

// "1 chamado" / "12 chamados"
export const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

// Topo da escala: o primeiro número "redondo" (1; 1,2; 1,5; 2; 2,5; 3; 4; 5; 6; 8 × 10ⁿ) que cabe o valor
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export function niceMax(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return Math.max(1, Math.round(NICE_STEPS.map(step => step * power).find(step => step >= value - 1e-9)!));
}

// "16/10"
export const formatDay = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

// "sex., 16/10"
export function formatWeekday(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString('pt-BR', { weekday: 'short' });
  return `${weekday}, ${formatDay(date)}`;
}

export const STAGE_LABEL: Record<AttendanceStage, { label: string; hint: string }> = {
  regulation: { label: 'Regulação', hint: 'da abertura à regulação' },
  dispatchWait: { label: 'Espera pela viatura', hint: 'da regulação ao despacho' },
  queue: { label: 'Espera na fila', hint: 'da abertura ao despacho' },
  departure: { label: 'Saída da viatura', hint: 'do despacho à saída' },
  travel: { label: 'Deslocamento', hint: 'da saída à chegada ao local' },
  response: { label: 'Tempo-resposta', hint: 'da abertura à chegada ao local' },
  onScene: { label: 'No local', hint: 'da chegada à saída do local' },
  transport: { label: 'Transporte', hint: 'do local ao hospital' },
  total: { label: 'Total', hint: 'da abertura ao fim' }
};

// Cores dos gráficos por classificação (tokens do tema: o amarelo do gráfico é mais escuro no claro)
export const PRIORITY_CHART_COLOR: Record<CallPriority, string> = {
  [CallPriority.EMERGENCIA]: 'var(--chart-red)',
  [CallPriority.URGENTE]: 'var(--chart-yellow)',
  [CallPriority.PRIORITARIO]: 'var(--chart-green)',
  [CallPriority.NAO_URGENTE]: 'var(--chart-blue)'
};

export type PeriodKey = 'hoje' | '7d' | '30d' | '90d';

export const PERIODS: Array<{ key: PeriodKey; label: string; days: number }> = [
  { key: 'hoje', label: 'Hoje', days: 1 },
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: '90d', label: '90 dias', days: 90 }
];

// Do começo do dia, N−1 dias atrás (no relógio do aparelho), até agora
export function periodRange(key: PeriodKey, now = Date.now()): { from: string; to: string } {
  const days = PERIODS.find(period => period.key === key)?.days ?? 30;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { from: start.toISOString(), to: new Date(now).toISOString() };
}
