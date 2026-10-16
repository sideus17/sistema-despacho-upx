import { Ambulance, Coordinates } from '../types';
import { distance } from './navigation/geo';

export interface PickerEntry {
  ambulance: Ambulance;
  distance: number | null; // metros até o celular, quando há GPS
  taken: boolean; // outro motorista está em turno nela
}

/**
 * Viaturas para o início do turno: as livres primeiro e as ocupadas no fim (só para mostrar);
 * com GPS, da mais perto para a mais longe, porque o motorista está ao lado da viatura do plantão.
 */
export function pickerOrder(ambulances: Ambulance[], position: Coordinates | null): PickerEntry[] {
  const entries = ambulances.map(ambulance => ({
    ambulance,
    distance: position ? distance(position, ambulance.location) : null,
    taken: ambulance.driver !== null
  }));
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) =>
      Number(a.entry.taken) - Number(b.entry.taken) ||
      (a.entry.distance ?? 0) - (b.entry.distance ?? 0) ||
      a.index - b.index
    )
    .map(({ entry }) => entry);
}

// Envio da posição durante o turno: no máximo a cada 30 s, quando andou ou de 5 em 5 min
export const LOCATION_MIN_INTERVAL = 30_000;
export const LOCATION_HEARTBEAT = 5 * 60_000;
export const LOCATION_MIN_MOVE = 30; // metros
export const LOCATION_MAX_ACCURACY = 100; // metros; pior que isso, a leitura não serve para a central

export interface SentLocation {
  position: Coordinates;
  at: number;
}

export function shouldSendLocation(
  last: SentLocation | null,
  next: { position: Coordinates; accuracy: number },
  now: number
): boolean {
  if (next.accuracy > LOCATION_MAX_ACCURACY) return false;
  if (!last) return true;
  const elapsed = now - last.at;
  if (elapsed < LOCATION_MIN_INTERVAL) return false;
  return distance(last.position, next.position) > LOCATION_MIN_MOVE || elapsed >= LOCATION_HEARTBEAT;
}
