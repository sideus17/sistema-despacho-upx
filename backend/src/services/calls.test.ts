import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CallPriority, CallStatus, UserRole } from '../types';
import { CallError, CallRow, parsePriority, parseTriage, toCall } from './calls';

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
