import { SpeedLimitSegment } from '../../types';

// Folga antes de o velocímetro ficar vermelho (o GPS oscila alguns km/h)
const TOLERANCE_KMH = 5;

// Limite do trecho em que a viatura está; null onde o mapa não tem limite (a placa some)
export function speedLimitAt(segments: SpeedLimitSegment[], along: number): number | null {
  return segments.find(segment => along >= segment.from && along < segment.to)?.kmh ?? null;
}

// m/s do GPS → km/h inteiro; sem leitura, null (o velocímetro some)
export const toKmh = (metersPerSecond: number | null | undefined) =>
  typeof metersPerSecond === 'number' && Number.isFinite(metersPerSecond) && metersPerSecond >= 0 ? Math.round(metersPerSecond * 3.6) : null;

export const overLimit = (kmh: number | null, limit: number | null) => kmh !== null && limit !== null && kmh > limit + TOLERANCE_KMH;
