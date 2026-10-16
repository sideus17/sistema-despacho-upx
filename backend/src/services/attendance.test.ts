import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CallOutcome, CallPriority, CallStatus, Hospital } from '../types';
import { detectProgress, resolveOutcome } from './attendance';
import { CallError, CallRow } from './calls';

const NOW = '2026-10-16T15:00:00.000Z';
const EARLIER = '2026-10-16T14:50:00.000Z';

// Chamado no centro; a viatura saiu da base, ~1,1 km ao sul
const CALL: CallRow = {
  id: 'call-1',
  lat: -23.5,
  lng: -47.45,
  address: 'Rua da Penha, 890',
  priority: CallPriority.URGENTE,
  status: CallStatus.EM_ATENDIMENTO,
  description: 'Queda',
  timestamp: EARLIER,
  ambulance_id: 'amb-1',
  dispatched_at: EARLIER,
  dispatch_lat: -23.51,
  dispatch_lng: -47.45
};

const hospital = (id: string, lat: number, lng: number): Hospital => ({
  id, name: id, shortName: id, kind: 'HOSPITAL', address: '', location: { lat, lng }
});
// Santa Casa ~2 km ao norte do chamado; Regional mais longe
const SANTA_CASA = hospital('santa-casa', -23.482, -47.45);
const REGIONAL = hospital('regional', -23.53, -47.52);
const HOSPITALS = [SANTA_CASA, REGIONAL];

test('a caminho: andando a 10 km/h ou a 100 m de onde estava no despacho', () => {
  const origin = { lat: -23.51, lng: -47.45 };
  assert.deepEqual(detectProgress(CALL, origin, 0, HOSPITALS, NOW), {});
  assert.deepEqual(detectProgress(CALL, origin, 4, HOSPITALS, NOW), { en_route_at: NOW });
  // ~110 m ao norte, sem velocidade informada
  assert.deepEqual(detectProgress(CALL, { lat: -23.509, lng: -47.45 }, null, HOSPITALS, NOW), { en_route_at: NOW });
  // Já a caminho: nada muda até chegar
  assert.deepEqual(detectProgress({ ...CALL, en_route_at: EARLIER }, { lat: -23.505, lng: -47.45 }, 12, HOSPITALS, NOW), {});
});

test('no local: a até 150 m do chamado, com a saída junto se ela não foi vista', () => {
  const near = { lat: -23.5012, lng: -47.45 }; // ~130 m
  assert.deepEqual(detectProgress(CALL, near, 2, HOSPITALS, NOW), { on_scene_at: NOW, en_route_at: NOW });
  assert.deepEqual(detectProgress({ ...CALL, en_route_at: EARLIER }, near, 2, HOSPITALS, NOW), { on_scene_at: NOW });
  assert.deepEqual(detectProgress({ ...CALL, en_route_at: EARLIER }, near, null, HOSPITALS, NOW), { on_scene_at: NOW });
});

test('passar em frente ao local pela outra pista, a caminho do retorno, não é chegar', () => {
  const enRoute = { ...CALL, en_route_at: EARLIER };
  assert.deepEqual(detectProgress(enRoute, { lat: -23.5006, lng: -47.45 }, 12.5, HOSPITALS, NOW), {});
  // Volta do retorno e para: aí sim
  assert.deepEqual(detectProgress(enRoute, { lat: -23.5001, lng: -47.45 }, 0, HOSPITALS, NOW), { on_scene_at: NOW });
});

test('saiu do local a mais de 300 m; perto do local nada muda', () => {
  const onScene = { ...CALL, en_route_at: EARLIER, on_scene_at: EARLIER };
  assert.deepEqual(detectProgress(onScene, { lat: -23.501, lng: -47.45 }, 0, HOSPITALS, NOW), {});
  assert.deepEqual(detectProgress(onScene, { lat: -23.495, lng: -47.45 }, 15, HOSPITALS, NOW), { left_scene_at: NOW });
});

test('no hospital escolhido, só depois de sair do local', () => {
  const leaving = { ...CALL, en_route_at: EARLIER, on_scene_at: EARLIER, left_scene_at: EARLIER, hospital_id: 'santa-casa' };
  const atSantaCasa = { lat: -23.4825, lng: -47.4505 };
  assert.deepEqual(detectProgress(leaving, atSantaCasa, 20, HOSPITALS, NOW), { hospital_arrival_at: NOW });
  // Passando pelo Regional com a Santa Casa escolhida: não conta
  assert.deepEqual(detectProgress(leaving, { lat: -23.5301, lng: -47.5201 }, 0, HOSPITALS, NOW), {});
  // Ainda no local (o chamado pode ficar perto de um hospital): não conta
  const scene = { ...CALL, lat: -23.4835, lng: -47.45, en_route_at: EARLIER, on_scene_at: EARLIER };
  assert.deepEqual(detectProgress(scene, atSantaCasa, 0, HOSPITALS, NOW), {});
});

test('sem hospital escolhido: parada perto de um da lista, que vira o destino; passando em frente, não', () => {
  const leaving = { ...CALL, en_route_at: EARLIER, on_scene_at: EARLIER, left_scene_at: EARLIER };
  const atRegional = { lat: -23.5302, lng: -47.5199 };
  assert.deepEqual(detectProgress(leaving, atRegional, 1, HOSPITALS, NOW), { hospital_arrival_at: NOW, hospital_id: 'regional' });
  assert.deepEqual(detectProgress(leaving, atRegional, 12, HOSPITALS, NOW), {});
  // Já no hospital: nada mais muda
  assert.deepEqual(detectProgress({ ...leaving, hospital_arrival_at: EARLIER, hospital_id: 'regional' }, atRegional, 0, HOSPITALS, NOW), {});
});

test('desfecho: com chegada ao hospital é transporte; sem ela, quem finaliza diz o motivo', () => {
  assert.equal(resolveOutcome({ hospital_arrival_at: EARLIER }, 'RECUSA'), CallOutcome.TRANSPORTADO);
  assert.equal(resolveOutcome({ hospital_arrival_at: null }, 'ATENDIDO_NO_LOCAL'), CallOutcome.ATENDIDO_NO_LOCAL);
  // GPS sem sinal no hospital: a equipe pode dizer que levou o paciente
  assert.equal(resolveOutcome({}, 'TRANSPORTADO'), CallOutcome.TRANSPORTADO);
  assert.throws(() => resolveOutcome({}, undefined), (error: CallError) => error.status === 400);
  assert.throws(() => resolveOutcome({}, 'FUGIU'), CallError);
});
