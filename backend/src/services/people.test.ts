import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CallPriority, CallStatus } from '../types';
import { PeopleNames, PeopleRow, REMOVED_ACCOUNT, computePeople } from './people';

const at = (seconds: number) => new Date(Date.parse('2026-10-17T12:00:00.000Z') + seconds * 1000).toISOString();

const ANA = 'u-ana';
const BRUNO = 'u-bruno';
const JOAO = 'u-joao';

const NAMES: PeopleNames = new Map([
  [ANA, { name: 'Ana Souza', demo: false }],
  [BRUNO, { name: 'Bruno Lima', demo: false }],
  [JOAO, { name: 'João Motorista', demo: true }]
]);

const row = (extra: Partial<PeopleRow>): PeopleRow => ({
  status: CallStatus.FINALIZADO,
  timestamp: at(0),
  priority: CallPriority.URGENTE,
  ...extra
});

const ROWS: PeopleRow[] = [
  // Ana registra e regula; Bruno despacha; João atende (saída 1 min, chegada 8 min)
  row({
    created_by: ANA, regulated_by: ANA, regulated_at: at(60), dispatched_by: BRUNO, dispatched_at: at(180),
    driver_id: JOAO, en_route_at: at(240), on_scene_at: at(660)
  }),
  // Ana registra, Bruno regula e muda a cor; Bruno despacha; João: o GPS só marcou a chegada
  row({
    created_by: ANA, initial_priority: CallPriority.URGENTE, priority: CallPriority.EMERGENCIA,
    regulated_by: BRUNO, regulated_at: at(120), dispatched_by: BRUNO, dispatched_at: at(150),
    driver_id: JOAO, en_route_at: at(600), on_scene_at: at(600)
  }),
  // Ana registra e encerra com orientação
  row({ status: CallStatus.ORIENTADO, created_by: ANA, regulated_by: ANA, regulated_at: at(200) }),
  // Chamado antigo, sem autor; viatura de quem não está mais no sistema
  row({ dispatched_at: at(100), driver_id: 'u-removido', on_scene_at: at(400) })
];

test('atendentes: o que cada um fez e os tempos de regulação e de despacho', () => {
  const { attendants } = computePeople(ROWS, NAMES);
  assert.deepEqual(attendants.map(person => person.name), ['Ana Souza', 'Bruno Lima']);

  const [ana, bruno] = attendants;
  assert.deepEqual(
    { opened: ana.opened, regulated: ana.regulated, dispatched: ana.dispatched, closed: ana.closedWithoutDispatch, reclassified: ana.reclassified },
    { opened: 3, regulated: 2, dispatched: 0, closed: 1, reclassified: 0 }
  );
  assert.deepEqual(ana.regulation, { n: 2, median: 130, p90: 186 });
  assert.equal(ana.dispatch.n, 0);

  assert.deepEqual(
    { opened: bruno.opened, regulated: bruno.regulated, dispatched: bruno.dispatched, reclassified: bruno.reclassified },
    { opened: 0, regulated: 1, dispatched: 2, reclassified: 1 }
  );
  // Regulação → despacho: 120 s e 30 s
  assert.deepEqual(bruno.dispatch, { n: 2, median: 75, p90: 111 });
});

test('motoristas: atendimentos, saída e chegada; saída = chegada não conta na saída', () => {
  const { drivers } = computePeople(ROWS, NAMES);
  const joao = drivers.find(person => person.id === JOAO)!;
  assert.equal(joao.attended, 2);
  assert.equal(joao.demo, true);
  assert.deepEqual(joao.departure, { n: 1, median: 60, p90: 60 });
  // Despacho → local: 480 s e 450 s
  assert.deepEqual(joao.arrival, { n: 2, median: 465, p90: 477 });
});

test('conta apagada aparece como removida; chamados sem autor ficam à parte', () => {
  const result = computePeople(ROWS, NAMES);
  assert.equal(result.unattributed, 1);
  const removed = result.drivers.find(person => person.id === 'u-removido')!;
  assert.equal(removed.name, REMOVED_ACCOUNT);
  assert.equal(removed.demo, false);
  assert.deepEqual(removed.arrival, { n: 1, median: 300, p90: 300 });
});

test('sem chamados, listas vazias', () => {
  assert.deepEqual(computePeople([], NAMES), { attendants: [], drivers: [], unattributed: 0 });
});
