import { Coordinates } from '../types';

const EARTH_RADIUS = 6371000; // metros
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

// Distância em linha reta (Haversine), em metros
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
