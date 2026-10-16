import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { CallPriority, CallStatus, UserRole } from '../types';
import {
  CallError,
  CallRow,
  parseCallLocation,
  parseCallerPhone,
  parsePriority,
  parseReference,
  parseTriage,
  recentMatches,
  toCall
} from './calls';

const ROW: CallRow = {
  id: 'call-1',
  lat: -23.5,
  lng: -47.45,
  address: 'Rua da Penha, 120, Sorocaba/SP',
  priority: CallPriority.URGENTE,
  status: CallStatus.PENDENTE,
  description: 'Queda de bicicleta',
  patient_age: 30,
  patient_gender: 'M',
  patient_symptoms: 'Queda de bicicleta',
  timestamp: '2026-10-16T12:00:00Z',
  ambulance_id: null,
  caller_phone: '15991234567',
  reference_point: 'Em frente à padaria',
  triage: { signals: ['TRAUMA'], suggested: CallPriority.URGENTE }
};

test('a central vê o telefone de quem ligou; a equipe não', () => {
  const central = toCall(ROW, UserRole.OPERADOR);
  assert.equal(central.callerPhone, '15991234567');
  assert.equal(central.reference, 'Em frente à padaria');
  assert.deepEqual(central.triage, { signals: ['TRAUMA'], suggested: CallPriority.URGENTE });
  assert.deepEqual(central.location, { lat: -23.5, lng: -47.45 });

  const equipe = toCall(ROW, UserRole.MOTORISTA);
  assert.equal('callerPhone' in equipe, false);
  assert.equal(equipe.reference, 'Em frente à padaria');
});

test('chamado antigo, sem as colunas da migração 005, continua igual', () => {
  const { caller_phone: _phone, reference_point: _reference, triage: _triage, ...old } = ROW;
  const call = toCall(old, UserRole.OPERADOR);
  assert.equal('callerPhone' in call, false);
  assert.equal('reference' in call, false);
  assert.equal('triage' in call, false);
  assert.equal(call.patientInfo.age, 30);
});

test('classificação: só as 4 cores', () => {
  assert.equal(parsePriority('NAO_URGENTE'), CallPriority.NAO_URGENTE);
  assert.equal(parsePriority('EMERGENCIA'), CallPriority.EMERGENCIA);
  assert.throws(() => parsePriority('ROXO'), CallError);
  assert.throws(() => parsePriority(undefined), /classificação de risco/);
});

test('triagem: sinais conhecidos, sem repetir; o resto é ignorado', () => {
  assert.deepEqual(parseTriage({ signals: ['DOR_PEITO', 'DOR_PEITO', 'INVENTADO', 3], suggested: 'EMERGENCIA' }), {
    signals: ['DOR_PEITO'],
    suggested: CallPriority.EMERGENCIA
  });
  assert.deepEqual(parseTriage({ signals: [], suggested: 'ROXO' }), null);
  assert.equal(parseTriage(undefined), null);
  assert.equal(parseTriage('DOR_PEITO'), null);
});

test('ponto de referência: opcional, espaços arrumados, até 200 caracteres', () => {
  assert.equal(parseReference(undefined), null);
  assert.equal(parseReference('   '), null);
  assert.equal(parseReference('  em frente   à padaria '), 'em frente à padaria');
  assert.throws(() => parseReference('x'.repeat(201)), (error: CallError) => error.status === 400);
  assert.throws(() => parseReference(12), CallError);
});

test('local escolhido: número de verdade e dentro da região atendida', () => {
  assert.equal(parseCallLocation(undefined), null);
  assert.deepEqual(parseCallLocation({ lat: -23.5, lng: -47.45 }), { lat: -23.5, lng: -47.45 });
  assert.throws(() => parseCallLocation({ lat: '-23.5', lng: -47.45 }), (error: CallError) => error.status === 400);
  // São Paulo capital: fora da região
  assert.throws(() => parseCallLocation({ lat: -23.55, lng: -46.63 }), (error: CallError) => error.status === 422);
});

test('telefone de quem ligou: opcional, fixo ou celular, gravado só com os dígitos', () => {
  assert.equal(parseCallerPhone(undefined), null);
  assert.equal(parseCallerPhone(''), null);
  assert.equal(parseCallerPhone('(15) 99123-4567'), '15991234567');
  assert.equal(parseCallerPhone('(15) 3232-1234'), '1532321234');
  assert.throws(() => parseCallerPhone('(15) 9912-345'), CallError);
  assert.throws(() => parseCallerPhone('(20) 3232-1234'), CallError); // DDD 20 não existe
  assert.throws(() => parseCallerPhone('(15) 8232-1234'), CallError); // fixo não começa com 8
});

describe('chamado repetido', () => {
  const NOW = Date.parse('2026-10-16T12:00:00Z');
  const row = (id: string, minutesAgo: number, extra: Partial<CallRow> = {}): CallRow => ({
    ...ROW,
    id,
    caller_phone: null,
    timestamp: new Date(NOW - minutesAgo * 60_000).toISOString(),
    ...extra
  });
  // ~100 m ao norte de ROW (-23.5, -47.45)
  const NEAR = { lat: -23.4991, lng: -47.45 };

  it('mesmo telefone ou até 150 m nas últimas 2 h; os mais novos primeiro', () => {
    const matches = recentMatches(
      [
        row('telefone', 90, { caller_phone: '15991234567', lat: -23.45, lng: -47.40 }),
        row('local', 10),
        row('os-dois', 30, { caller_phone: '15991234567' }),
        row('longe', 5, { lat: -23.51, lng: -47.45 })
      ],
      { phone: '15991234567', location: NEAR },
      NOW
    );
    assert.deepEqual(matches.map(match => [match.row.id, match.reasons]), [
      ['local', ['local']],
      ['os-dois', ['telefone', 'local']],
      ['telefone', ['telefone']]
    ]);
    assert.ok(matches[0].distance! > 90 && matches[0].distance! < 110);
  });

  it('cancelados e os de mais de 2 h ficam de fora; sem local, a distância é nula', () => {
    const matches = recentMatches(
      [
        row('cancelado', 10, { caller_phone: '15991234567', status: CallStatus.CANCELADO }),
        row('antigo', 121, { caller_phone: '15991234567' }),
        row('finalizado', 100, { caller_phone: '15991234567', status: CallStatus.FINALIZADO })
      ],
      { phone: '15991234567' },
      NOW
    );
    assert.deepEqual(matches.map(match => [match.row.id, match.distance]), [['finalizado', null]]);
  });
});

test('horários do atendimento: só os que aconteceram; hospital e desfecho junto', () => {
  const call = toCall(
    { ...ROW, dispatched_at: '2026-10-16T10:02:00Z', on_scene_at: '2026-10-16T10:11:00Z', en_route_at: null, hospital_id: 'hosp-chs', outcome: null },
    UserRole.MOTORISTA
  );
  assert.deepEqual(call.times, { dispatched: '2026-10-16T10:02:00Z', onScene: '2026-10-16T10:11:00Z' });
  assert.equal(call.hospitalId, 'hosp-chs');
  assert.equal('outcome' in call, false);
  assert.equal('times' in toCall(ROW, UserRole.OPERADOR), false);
});
