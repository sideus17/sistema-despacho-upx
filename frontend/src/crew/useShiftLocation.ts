import { useEffect, useRef } from 'react';
import { updateAmbulanceLocation } from '../services/api';
import { SentLocation, shouldSendLocation } from './shift';

/**
 * Durante o turno, o celular é o GPS da viatura: manda a posição para a central enquanto o app
 * está aberto. Fica desligado na navegação, que já manda a sua. Com a tela apagada o navegador
 * para de informar a posição (limite do navegador).
 */
export function useShiftLocation(ambulanceId: string | undefined, enabled: boolean) {
  const last = useRef<SentLocation | null>(null);

  useEffect(() => {
    if (!ambulanceId || !enabled || !('geolocation' in navigator)) return;
    last.current = null;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { position: { lat: coords.latitude, lng: coords.longitude }, accuracy: coords.accuracy };
        const now = Date.now();
        if (!shouldSendLocation(last.current, next, now)) return;
        last.current = { position: next.position, at: now };
        updateAmbulanceLocation(ambulanceId, next.position, coords.speed).catch(() => {
          // Sem sinal: tenta de novo daqui a 30 s, mesmo parada (a posição "nula" conta como longe)
          last.current = { position: { lat: 0, lng: 0 }, at: Date.now() };
        });
      },
      () => { /* sem permissão ou sem sinal: a viatura fica na última posição conhecida */ },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [ambulanceId, enabled]);
}
