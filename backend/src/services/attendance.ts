import { CallOutcome, Coordinates, Hospital } from '../types';
import { CallError, CallRow } from './calls';
import { distanceMeters } from './geo';

// Etapas do atendimento detectadas pela posição da viatura: o motorista não marca nada.
// Sem Supabase: dá para testar.

export const EN_ROUTE_SPEED = 10 / 3.6; // m/s: andando a 10 km/h ou mais, saiu
export const EN_ROUTE_MOVE = 100; // metros desde onde estava no despacho
export const ON_SCENE_RADIUS = 150; // o ponto do chamado pode ser aproximado (rua sem o número)
// Chegar é parar: passando em frente pela outra pista da avenida (a caminho do retorno) não conta
export const ON_SCENE_SPEED = 10 / 3.6;
export const LEFT_SCENE_RADIUS = 300;
export const HOSPITAL_RADIUS = 200; // hospital é grande: a entrada da ambulância fica longe do ponto
// Sem hospital escolhido, vale qualquer um da lista, mas só parando (passar em frente não conta)
export const HOSPITAL_STOP_SPEED = 15 / 3.6;

export type ProgressColumns = Pick<
  CallRow,
  'en_route_at' | 'on_scene_at' | 'left_scene_at' | 'hospital_arrival_at' | 'hospital_id'
>;

/**
 * Colunas que mudam com esta posição (só as vazias; uma etapa marcada não volta atrás):
 * - a caminho: andando a 10 km/h ou a 100 m de onde estava no despacho;
 * - no local: a até 150 m do chamado, parada ou devagar (as etapas anteriores que faltaram vão junto);
 * - saiu do local: depois de chegar, a mais de 300 m;
 * - no hospital: depois de sair do local, a até 200 m do hospital escolhido (ou, sem escolha, parada
 *   perto de qualquer hospital da lista, que passa a ser o destino). Antes disso não conta: a base ou
 *   o próprio chamado podem ficar perto de um hospital.
 */
export function detectProgress(
  call: CallRow,
  position: Coordinates,
  speed: number | null,
  hospitals: Hospital[],
  now: string
): Partial<ProgressColumns> {
  const update: Partial<ProgressColumns> = {};
  const toScene = distanceMeters(position, { lat: call.lat, lng: call.lng });

  if (!call.on_scene_at) {
    // Sem velocidade informada pelo celular, vale só a distância
    if (toScene <= ON_SCENE_RADIUS && (speed === null || speed <= ON_SCENE_SPEED)) {
      update.on_scene_at = now;
      if (!call.en_route_at) update.en_route_at = now;
    } else if (!call.en_route_at) {
      const origin = call.dispatch_lat != null && call.dispatch_lng != null ? { lat: call.dispatch_lat, lng: call.dispatch_lng } : null;
      const moving = (speed ?? 0) >= EN_ROUTE_SPEED || (origin !== null && distanceMeters(origin, position) >= EN_ROUTE_MOVE);
      if (moving) update.en_route_at = now;
    }
    return update;
  }

  if (!call.left_scene_at && toScene > LEFT_SCENE_RADIUS) update.left_scene_at = now;
  const left = call.left_scene_at || update.left_scene_at;
  if (left && !call.hospital_arrival_at) {
    const hospital = arrivedAt(position, speed, hospitals, call.hospital_id ?? null);
    if (hospital) {
      update.hospital_arrival_at = now;
      if (!call.hospital_id) update.hospital_id = hospital.id;
    }
  }
  return update;
}

function arrivedAt(position: Coordinates, speed: number | null, hospitals: Hospital[], chosen: string | null): Hospital | null {
  if (chosen) {
    const hospital = hospitals.find(item => item.id === chosen);
    return hospital && distanceMeters(position, hospital.location) <= HOSPITAL_RADIUS ? hospital : null;
  }
  if (speed !== null && speed > HOSPITAL_STOP_SPEED) return null;
  let nearest: Hospital | null = null;
  let best = HOSPITAL_RADIUS;
  for (const hospital of hospitals) {
    const distance = distanceMeters(position, hospital.location);
    if (distance <= best) {
      best = distance;
      nearest = hospital;
    }
  }
  return nearest;
}

const OUTCOMES = Object.values(CallOutcome) as string[];

// Com chegada ao hospital, foi transporte; sem ela, quem finaliza diz como terminou
export function resolveOutcome(call: Pick<CallRow, 'hospital_arrival_at'>, input: unknown): CallOutcome {
  if (call.hospital_arrival_at) return CallOutcome.TRANSPORTADO;
  if (typeof input === 'string' && OUTCOMES.includes(input)) return input as CallOutcome;
  throw new CallError(400, 'Diga como terminou o atendimento.');
}
