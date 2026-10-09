import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Coordinates } from '../../types';
import { bearing, cumulativeDistances, pointAlong } from './geo';

export interface GeoFix {
  position: Coordinates;
  heading: number | null; // graus, quando o aparelho informa
  speed: number | null; // m/s
  accuracy: number; // metros
}

const GEO_ERRORS: Record<number, string> = {
  1: 'Permita o acesso à localização para navegar.',
  2: 'Sinal de GPS indisponível. Tentando de novo…',
  3: 'O GPS demorou para responder. Tentando de novo…'
};

// GPS real do aparelho
export function useGeolocation(enabled: boolean) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!('geolocation' in navigator)) {
      setError('Este aparelho não tem GPS disponível no navegador.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setError(null);
        setFix({
          position: { lat: coords.latitude, lng: coords.longitude },
          heading: coords.heading !== null && !Number.isNaN(coords.heading) ? coords.heading : null,
          speed: coords.speed,
          accuracy: coords.accuracy
        });
      },
      (err) => setError(GEO_ERRORS[err.code] ?? 'Não foi possível obter a localização.'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { fix, error };
}

const SIMULATED_SPEED = 12.5; // m/s ≈ 45 km/h
const DEVIATION_METERS = 90;

/**
 * Simula o carro andando pela rota (para testes e apresentação, via ?simular=1).
 * Quando a rota muda (recálculo), recomeça do início da nova rota.
 * `deviate()` desloca o carro para fora da rota, para testar o recálculo.
 */
export function useSimulatedGeolocation(line: Coordinates[] | undefined, enabled: boolean) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const travelled = useRef(0);
  const offset = useRef({ lat: 0, lng: 0 });
  const cumulative = useMemo(() => (line ? cumulativeDistances(line) : []), [line]);

  useEffect(() => {
    if (!enabled || !line || line.length < 2) return;
    travelled.current = 0;
    offset.current = { lat: 0, lng: 0 };

    const tick = () => {
      const { point, segmentIndex } = pointAlong(line, cumulative, travelled.current);
      setFix({
        position: { lat: point.lat + offset.current.lat, lng: point.lng + offset.current.lng },
        heading: bearing(line[segmentIndex], line[segmentIndex + 1] ?? line[segmentIndex]),
        speed: SIMULATED_SPEED,
        accuracy: 5
      });
      travelled.current = Math.min(travelled.current + SIMULATED_SPEED, cumulative[cumulative.length - 1]);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [enabled, line, cumulative]);

  const deviate = useCallback(() => {
    // ~90 m para o lado: o suficiente para sair da rota e disparar o recálculo
    offset.current = { lat: DEVIATION_METERS / 111320, lng: DEVIATION_METERS / 111320 };
  }, []);

  return { fix, deviate };
}
