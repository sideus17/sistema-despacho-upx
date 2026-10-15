import { LngLatBounds } from 'maplibre-gl';
import { Coordinates } from '../types';

export const toLngLat = (c: Coordinates): [number, number] => [c.lng, c.lat];

export const lineFeature = (line: Coordinates[]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: line.map(toLngLat) }
});

export function boundsOf(points: Coordinates[]): LngLatBounds {
  const bounds = new LngLatBounds();
  for (const point of points) bounds.extend(toLngLat(point));
  return bounds;
}
