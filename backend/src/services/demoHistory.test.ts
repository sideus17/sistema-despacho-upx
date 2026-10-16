import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AmbulanceType, CallOutcome, CallPriority, CallStatus, Hospital } from '../types';
import { TRIAGE_SIGNALS } from './calls';
import { DemoAmbulance, DemoOptions, generateDemoHistory } from './demoHistory';
import { insideServiceArea } from './geocodingService';
import { hourOf } from './indicators';
import { isValidPhone } from './profile';

// Bases e viaturas do seed; hospitais da migração 006
const CENTRAL = { lat: -23.5015, lng: -47.4526 };
const NORTE = { lat: -23.4889, lng: -47.4419 };
const AMBULANCES: DemoAmbulance[] = [
  { id: 'amb-1', type: AmbulanceType.USA, location: CENTRAL },
  { id: 'amb-2', type: AmbulanceType.USB, location: CENTRAL },
  { id: 'amb-3', type: AmbulanceType.USB, location: NORTE },
  { id: 'amb-4', type: AmbulanceType.MOTOLANCIA, location: NORTE }
];
const hospital = (id: string, kind: Hospital['kind'], lat: number, lng: number): Hospital => ({
  id, name: id, shortName: id, kind, address: '', location: { lat, lng }
});
const HOSPITALS = [
  hospital('hosp-chs', 'HOSPITAL', -23.510985, -47.456791),
  hospital('hosp-regional', 'HOSPITAL', -23.526805, -47.519075),
  hospital('hosp-santa-casa', 'HOSPITAL', -23.499675, -47.44444),
  hospital('ps-uph-norte', 'PRONTO_SOCORRO', -23.483483, -47.472295),
  hospital('ps-upa-eden', 'PRONTO_SOCORRO', -23.429184, -47.415699)
];

const NOW = Date.parse('2026-10-16T15:00:00.000Z');
const OPTIONS: DemoOptions = { count: 2000, days: 60, now: NOW, seed: 17, ambulances: AMBULANCES, hospitals: HOSPITALS };
const ROWS = generateDemoHistory(OPTIONS);
const STAGES = ['timestamp', 'dispatched_at', 'en_route_at', 'on_scene_at', 'left_scene_at', 'hospital_arrival_at', 'finished_at'] as const;
const share = (predicate: (row: (typeof ROWS)[number]) => boolean) => ROWS.filter(predicate).length / ROWS.length;

test('mesma semente, mesmo histórico; outra semente, outro', () => {
  assert.deepEqual(generateDemoHistory({ ...OPTIONS, count: 50 }), generateDemoHistory({ ...OPTIONS, count: 50 }));
  assert.notDeepEqual(generateDemoHistory({ ...OPTIONS, count: 50 }), generateDemoHistory({ ...OPTIONS, count: 50, seed: 18 }));
});

test('todos marcados como demonstração, em Sorocaba, no período e já terminados', () => {
  assert.ok(ROWS.length >= OPTIONS.count * 0.98 && ROWS.length <= OPTIONS.count);
  assert.equal(new Set(ROWS.map(row => row.id)).size, ROWS.length);
  for (const row of ROWS) {
    assert.equal(row.demo, true);
    assert.match(row.id, /^demo-/);
    assert.ok(insideServiceArea(row), row.id);
    assert.ok(Date.parse(row.timestamp) >= NOW - 60 * 24 * 3600_000 && Date.parse(row.timestamp) < NOW);
    assert.ok(row.status === CallStatus.FINALIZADO || row.status === CallStatus.CANCELADO);
  }
});

test('horários em ordem e o fim antes de agora', () => {
  for (const row of ROWS) {
    const times = STAGES.map(column => row[column]).filter((value): value is string => !!value).map(Date.parse);
    assert.deepEqual(times, [...times].sort((a, b) => a - b), row.id);
    if (row.finished_at) assert.ok(Date.parse(row.finished_at) <= NOW);
  }
});

test('desfecho coerente com o transporte, a cor e a viatura', () => {
  for (const row of ROWS) {
    if (row.status === CallStatus.CANCELADO) {
      assert.equal(row.ambulance_id ?? null, null);
      assert.equal(row.outcome ?? null, null);
      continue;
    }
    assert.ok(AMBULANCES.some(ambulance => ambulance.id === row.ambulance_id));
    assert.equal(row.outcome === CallOutcome.TRANSPORTADO, !!row.hospital_arrival_at, row.id);
    assert.equal(!!row.hospital_id, !!row.hospital_arrival_at, row.id);
    if (row.outcome === CallOutcome.OBITO) assert.equal(row.priority, CallPriority.EMERGENCIA);
    if (row.ambulance_id === 'amb-4') assert.equal(row.hospital_arrival_at ?? null, null); // motolância não transporta
  }
});

test('proporções próximas das combinadas', () => {
  const near = (value: number, expected: number, margin: number) => assert.ok(Math.abs(value - expected) <= margin, `${value} ≉ ${expected}`);
  near(share(row => row.priority === CallPriority.EMERGENCIA), 0.15, 0.03);
  near(share(row => row.priority === CallPriority.URGENTE), 0.35, 0.04);
  near(share(row => row.priority === CallPriority.NAO_URGENTE), 0.15, 0.03);
  near(share(row => row.status === CallStatus.CANCELADO), 0.03, 0.015);
  // Alguns atendimentos sem a chegada registrada (indicador de qualidade da tela)
  const finished = ROWS.filter(row => row.status === CallStatus.FINALIZADO);
  near(finished.filter(row => !row.on_scene_at).length / finished.length, 0.04, 0.02);
  // Mais chamados de dia que de madrugada
  assert.ok(share(row => hourOf(row.timestamp) >= 9 && hourOf(row.timestamp) < 21) > 0.55);
  assert.ok(share(row => hourOf(row.timestamp) < 6) < 0.12);
});

test('telefone válido, sinais da triagem da própria cor', () => {
  const known = new Set<string>(TRIAGE_SIGNALS);
  for (const row of ROWS) {
    if (row.caller_phone) assert.ok(isValidPhone(row.caller_phone), row.caller_phone);
    if (row.priority === CallPriority.NAO_URGENTE) assert.equal(row.triage, null);
    else {
      assert.equal(row.triage?.suggested, row.priority);
      assert.ok(row.triage!.signals.length >= 1 && row.triage!.signals.every(signal => known.has(signal)));
    }
  }
});
