import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CallEventAction, UserRole } from '../types';
import { actorOf, buildEvent, toCallEvent } from './callEvents';

const USER = { id: 'u-1', fullName: 'Ana Souza', role: UserRole.OPERADOR, email: 'ana@samu.local' };

test('o autor é o usuário logado, com o nome de agora', () => {
  assert.deepEqual(actorOf(USER), { id: 'u-1', name: 'Ana Souza', role: UserRole.OPERADOR });
});

test('o evento guarda quem, o quê e os dados (sem horário: o banco põe o de agora)', () => {
  const data = { changes: { priority: ['URGENTE', 'EMERGENCIA'] } };
  const event = buildEvent('call-1', CallEventAction.REGULACAO, actorOf(USER), data);
  assert.deepEqual(event, {
    call_id: 'call-1',
    action: CallEventAction.REGULACAO,
    actor_id: 'u-1',
    actor_name: 'Ana Souza',
    actor_role: UserRole.OPERADOR,
    data
  });
  assert.notEqual(event.data, data);
  assert.equal(buildEvent('call-1', CallEventAction.ABERTURA, actorOf(USER), {}, '2026-10-17T12:00:00Z').at, '2026-10-17T12:00:00Z');
});

test('linha do banco vira o evento da API', () => {
  const event = toCallEvent({
    id: 7,
    call_id: 'call-1',
    at: '2026-10-17T12:00:00Z',
    action: CallEventAction.FINALIZACAO,
    actor_id: null,
    actor_name: 'Motorista removido',
    actor_role: UserRole.MOTORISTA,
    data: null
  });
  assert.deepEqual(event, {
    id: 7,
    at: '2026-10-17T12:00:00Z',
    action: CallEventAction.FINALIZACAO,
    actor: { id: null, name: 'Motorista removido', role: UserRole.MOTORISTA },
    data: {}
  });
});
