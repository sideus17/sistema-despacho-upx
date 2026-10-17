import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CallOutcome, CallPriority, CallStatus } from '../types';
import { IndicatorRow, computeIndicators, dayOf, daysBetween, hourOf, percentile, secondsBetween } from './indicators';

// Horário `seconds` segundos depois de `base`
const at = (base: string, seconds: number) => new Date(Date.parse(base) + seconds * 1000).toISOString();

// 23h30 do dia 14 em Sorocaba (02h30 do dia 15 em UTC) e 10h do dia 15
const NIGHT = '2026-10-15T02:30:00.000Z';
const MORNING = '2026-10-15T13:00:00.000Z';
const PERIOD = { from: '2026-10-14T03:00:00.000Z', to: '2026-10-16T12:00:00.000Z' };

const row = (base: string, priority: CallPriority, status: CallStatus, times: Record<string, number>, extra: Partial<IndicatorRow> = {}): IndicatorRow => ({
  priority,
  status,
  timestamp: base,
  ...Object.fromEntries(Object.entries(times).map(([column, seconds]) => [column, at(base, seconds)])),
  ...extra
});

const ROWS: IndicatorRow[] = [
  // Vermelho transportado: chegou em 8 min (dentro dos 10)
  row(NIGHT, CallPriority.EMERGENCIA, CallStatus.FINALIZADO,
    { dispatched_at: 60, en_route_at: 120, on_scene_at: 480, left_scene_at: 1500, hospital_arrival_at: 2100, finished_at: 3000 },
    { hospital_id: 'hosp-chs', outcome: CallOutcome.TRANSPORTADO, ambulance_id: 'amb-1' }),
  // Vermelho atendido no local: chegou em 15 min (fora da meta)
  row(MORNING, CallPriority.EMERGENCIA, CallStatus.FINALIZADO,
    { dispatched_at: 120, en_route_at: 180, on_scene_at: 900, finished_at: 2100 },
    { outcome: CallOutcome.ATENDIDO_NO_LOCAL, ambulance_id: 'amb-1' }),
  // Amarelo: o GPS só marcou a chegada (saída e chegada no mesmo instante)
  row(MORNING, CallPriority.URGENTE, CallStatus.FINALIZADO,
    { dispatched_at: 300, en_route_at: 600, on_scene_at: 600, finished_at: 1800 },
    { outcome: CallOutcome.RECUSA, ambulance_id: 'amb-2' }),
  // Verde sem GPS e sem desfecho (antes da etapa 4)
  row(MORNING, CallPriority.PRIORITARIO, CallStatus.FINALIZADO, { dispatched_at: 200, finished_at: 2000 }, { ambulance_id: 'amb-2' }),
  row(MORNING, CallPriority.NAO_URGENTE, CallStatus.CANCELADO, {}),
  row(MORNING, CallPriority.URGENTE, CallStatus.EM_ATENDIMENTO, { dispatched_at: 100 }, { ambulance_id: 'amb-3' })
];

test('percentil com interpolação; lista vazia não tem', () => {
  const values = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(percentile(values, 0.5), 50);
  assert.equal(percentile(values, 0.9), 90);
  assert.equal(percentile([60, 100, 120, 200, 300], 0.9), 260);
  assert.equal(percentile([], 0.5), null);
});

test('intervalo: falta um horário ou fora de ordem não conta', () => {
  assert.equal(secondsBetween(MORNING, at(MORNING, 90)), 90);
  assert.equal(secondsBetween(MORNING, null), null);
  assert.equal(secondsBetween(at(MORNING, 90), MORNING), null);
});

test('hora e dia no fuso de Sorocaba', () => {
  assert.equal(hourOf(NIGHT), 23);
  assert.equal(dayOf(NIGHT), '2026-10-14');
  assert.equal(hourOf(MORNING), 10);
  assert.deepEqual(daysBetween('2026-10-30T12:00:00Z', '2026-11-02T12:00:00Z'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
});

test('totais por status e por cor', () => {
  const result = computeIndicators(ROWS, PERIOD);
  assert.equal(result.total, 6);
  assert.deepEqual(result.byStatus, { PENDENTE: 0, EM_ATENDIMENTO: 1, FINALIZADO: 4, CANCELADO: 1 });
  assert.deepEqual(result.byPriority, { EMERGENCIA: 2, URGENTE: 2, PRIORITARIO: 1, NAO_URGENTE: 1 });
});

test('tempos de cada etapa usam só os chamados com os dois horários', () => {
  const { stages } = computeIndicators(ROWS, PERIOD);
  assert.deepEqual(stages.queue, { n: 5, median: 120, p90: 260 });
  // O amarelo com saída = chegada fica fora da saída e do deslocamento
  assert.deepEqual(stages.departure, { n: 2, median: 60, p90: 60 });
  assert.deepEqual(stages.travel, { n: 2, median: 540, p90: 684 });
  assert.equal(stages.response.n, 3);
  assert.equal(stages.response.median, 600);
  // No local: até a saída do local ou, sem transporte, até o fim
  assert.deepEqual(stages.onScene, { n: 3, median: 1200, p90: 1200 });
  assert.deepEqual(stages.transport, { n: 1, median: 600, p90: 600 });
  assert.deepEqual(stages.total, { n: 4, median: 2050, p90: 2730 });
});

test('tempo-resposta comparado com a meta de cada cor', () => {
  const { response } = computeIndicators(ROWS, PERIOD);
  assert.equal(response.overall.withinTarget, 2 / 3);
  assert.deepEqual(response.byPriority.EMERGENCIA, { n: 2, median: 690, p90: 858, target: 600, withinTarget: 0.5 });
  assert.deepEqual(response.byPriority.URGENTE, { n: 1, median: 600, p90: 600, target: 1200, withinTarget: 1 });
  assert.deepEqual(response.byPriority.PRIORITARIO, { n: 0, median: null, p90: null, target: 1800, withinTarget: null });
});

test('desfechos, hospitais, viaturas e qualidade dos dados', () => {
  const result = computeIndicators(ROWS, PERIOD);
  assert.deepEqual(result.byOutcome, { TRANSPORTADO: 1, ATENDIDO_NO_LOCAL: 1, RECUSA: 1, OBITO: 0, NAO_LOCALIZADO: 0 });
  assert.deepEqual(result.byHospital, [{ hospitalId: 'hosp-chs', count: 1, transportMedian: 600 }]);
  assert.deepEqual(result.byAmbulance, [
    { ambulanceId: 'amb-1', count: 2, responseMedian: 690 },
    { ambulanceId: 'amb-2', count: 2, responseMedian: 600 },
    { ambulanceId: 'amb-3', count: 1, responseMedian: null }
  ]);
  assert.deepEqual(result.quality, { finished: 4, missingOnScene: 1, missingOutcome: 1 });
});

test('por hora e por dia (todos os dias do período, com zero)', () => {
  const result = computeIndicators(ROWS, PERIOD);
  assert.equal(result.byHour.length, 24);
  assert.equal(result.byHour[23], 1);
  assert.equal(result.byHour[10], 5);
  assert.deepEqual(result.byDay, [
    { date: '2026-10-14', count: 1 },
    { date: '2026-10-15', count: 5 },
    { date: '2026-10-16', count: 0 }
  ]);
});

test('sem chamados: tudo zerado e sem medianas', () => {
  const result = computeIndicators([], PERIOD);
  assert.equal(result.total, 0);
  assert.equal(result.stages.response.median, null);
  assert.equal(result.response.overall.withinTarget, null);
  assert.equal(result.byDay.length, 3);
});
