import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AmbulanceType, CallEventAction, CallOutcome, CallPriority, CallStatus, Hospital, UserRole } from '../types';
import { TRIAGE_SIGNALS } from './calls';
import { DEMO_PEOPLE, DemoAmbulance, DemoOptions, demoEvents, generateDemoHistory } from './demoHistory';
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
const STAGES = ['timestamp', 'regulated_at', 'dispatched_at', 'en_route_at', 'on_scene_at', 'left_scene_at', 'hospital_arrival_at', 'finished_at'] as const;
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
    assert.ok([CallStatus.FINALIZADO, CallStatus.ORIENTADO, CallStatus.CANCELADO].includes(row.status), row.status);
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
    if (row.status !== CallStatus.FINALIZADO) {
      // Encerrado na regulação: sem viatura, sem desfecho, com o motivo ou a orientação
      assert.equal(row.ambulance_id ?? null, null);
      assert.equal(row.outcome ?? null, null);
      assert.equal(row.finished_at, row.regulated_at);
      if (row.status === CallStatus.CANCELADO) assert.ok(row.close_reason, row.id);
      else assert.ok(row.close_note && row.priority === CallPriority.NAO_URGENTE, row.id);
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
  // ~35% dos azuis encerrados com orientação; ~10% reclassificados na regulação
  near(share(row => row.status === CallStatus.ORIENTADO), 0.15 * 0.35, 0.02);
  near(share(row => row.initial_priority !== row.priority), 0.1, 0.02);
  // Alguns atendimentos sem a chegada registrada (indicador de qualidade da tela)
  const finished = ROWS.filter(row => row.status === CallStatus.FINALIZADO);
  near(finished.filter(row => !row.on_scene_at).length / finished.length, 0.04, 0.02);
  // Mais chamados de dia que de madrugada
  assert.ok(share(row => hourOf(row.timestamp) >= 9 && hourOf(row.timestamp) < 21) > 0.55);
  assert.ok(share(row => hourOf(row.timestamp) < 6) < 0.12);
});

test('telefone válido, sinais da triagem da cor do registro', () => {
  const known = new Set<string>(TRIAGE_SIGNALS);
  for (const row of ROWS) {
    if (row.caller_phone) assert.ok(isValidPhone(row.caller_phone), row.caller_phone);
    if (row.initial_priority === CallPriority.NAO_URGENTE) assert.equal(row.triage, null);
    else {
      assert.equal(row.triage?.suggested, row.initial_priority);
      assert.ok(row.triage!.signals.length >= 1 && row.triage!.signals.every(signal => known.has(signal)));
    }
  }
});

test('quem fez cada passo: atendentes do turno e o motorista da viatura', () => {
  const people = new Map(DEMO_PEOPLE.map(person => [person.id, person]));
  const shift = (iso: string) => (hourOf(iso) >= 7 && hourOf(iso) < 19 ? 'dia' : 'noite');
  for (const row of ROWS) {
    for (const [column, time] of [['created_by', row.timestamp], ['regulated_by', row.timestamp], ['dispatched_by', row.dispatched_at]] as const) {
      const id = row[column];
      if (!id) continue;
      const person = people.get(id);
      assert.equal(person?.role, UserRole.OPERADOR, `${row.id} ${column}`);
      assert.equal(person!.shift, shift(time!), `${row.id} ${column}`);
    }
    assert.ok(row.created_by && row.regulated_by, row.id);
    assert.equal(!!row.dispatched_by, !!row.ambulance_id, row.id);
    if (row.driver_id) assert.equal(people.get(row.driver_id)?.role, UserRole.MOTORISTA);
  }
  // A mesma viatura, no mesmo turno, sempre com o mesmo motorista
  const drivers = new Map<string, Set<string>>();
  for (const row of ROWS.filter(item => item.driver_id)) {
    const key = `${row.ambulance_id}-${shift(row.dispatched_at!)}`;
    drivers.set(key, (drivers.get(key) ?? new Set()).add(row.driver_id!));
  }
  for (const [key, ids] of drivers) assert.equal(ids.size, 1, key);
});

test('auditoria da demonstração: registro, regulação, despacho e fim, na ordem dos horários', () => {
  const rows = ROWS.slice(0, 300);
  const codes = { 'amb-1': 'USA-01', 'amb-2': 'USB-01', 'amb-3': 'USB-02', 'amb-4': 'MOTO-01' };
  const events = demoEvents(rows, codes);
  for (const row of rows) {
    const own = events.filter(event => event.call_id === row.id);
    const expected = [CallEventAction.ABERTURA, CallEventAction.REGULACAO];
    if (row.ambulance_id) expected.push(CallEventAction.DESPACHO);
    if (row.status === CallStatus.FINALIZADO) expected.push(CallEventAction.FINALIZACAO);
    assert.deepEqual(own.map(event => event.action), expected, row.id);
    const times = own.map(event => Date.parse(event.at!));
    assert.deepEqual(times, [...times].sort((a, b) => a - b), row.id);

    const regulation = own[1].data as { changes: { priority?: string[]; status: string[] } };
    assert.deepEqual(regulation.changes.status, [CallStatus.AGUARDANDO_REGULACAO, row.status === CallStatus.FINALIZADO ? CallStatus.PENDENTE : row.status]);
    assert.equal(!!regulation.changes.priority, row.initial_priority !== row.priority, row.id);
    if (row.ambulance_id) {
      const dispatch = own[2].data as { ambulanceCode: string; driverName: string };
      assert.equal(dispatch.ambulanceCode, codes[row.ambulance_id as keyof typeof codes]);
      assert.ok(dispatch.driverName, row.id);
    }
  }
  // Com GPS, quem finaliza é o motorista; sem ele, a central
  const finishes = events.filter(event => event.action === CallEventAction.FINALIZACAO);
  assert.ok(finishes.some(event => event.actor_role === UserRole.MOTORISTA));
  for (const event of finishes) {
    const row = rows.find(item => item.id === event.call_id)!;
    assert.equal(event.actor_role, row.en_route_at ? UserRole.MOTORISTA : UserRole.OPERADOR, row.id);
  }
});
