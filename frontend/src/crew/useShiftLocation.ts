import { useEffect, useRef, useState } from 'react';
import { updateAmbulanceLocation } from '../services/api';
import { STALE_LOCATION_MS } from '../utils/ambulances';
import { SentLocation, shouldSendLocation } from './shift';

// O que o motorista precisa saber do próprio GPS: a central depende dele para as etapas e a distância
export type ShiftLocationProblem = 'negado' | 'sem-sinal' | null;

export interface ShiftLocationStatus {
  problem: ShiftLocationProblem;
  // Última leitura boa do GPS (ou o início do turno, se ainda não houve nenhuma)
  since: number;
  hadFix: boolean;
  retry: () => void;
}

const CHECK_MS = 30_000;

/**
 * Durante o turno, o celular é o GPS da viatura: manda a posição para a central enquanto o app
 * está aberto. Fica desligado na navegação, que já manda a sua. Com a tela apagada o navegador
 * para de informar a posição (limite do navegador). Devolve o problema do GPS, se houver: permissão
 * negada na hora, ou nenhuma leitura há 7 min (o mesmo limite com que a central marca o GPS parado).
 */
export function useShiftLocation(ambulanceId: string | undefined, enabled: boolean, busy = false): ShiftLocationStatus {
  const last = useRef<SentLocation | null>(null);
  const lastFix = useRef<number | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [denied, setDenied] = useState(false);
  const [lost, setLost] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Em atendimento manda mais vezes (a posição marca as etapas); muda sem reiniciar o GPS
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!ambulanceId || !enabled || !('geolocation' in navigator)) return;
    last.current = null;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        lastFix.current = Date.now();
        setDenied(false);
        setLost(false);
        const next = { position: { lat: coords.latitude, lng: coords.longitude }, accuracy: coords.accuracy };
        const now = Date.now();
        if (!shouldSendLocation(last.current, next, now, busyRef.current)) return;
        last.current = { position: next.position, at: now };
        updateAmbulanceLocation(ambulanceId, next.position, coords.speed).catch(() => {
          // Sem sinal: tenta de novo daqui a 30 s, mesmo parada (a posição "nula" conta como longe)
          last.current = { position: { lat: 0, lng: 0 }, at: Date.now() };
        });
      },
      error => {
        // Sem permissão: avisa já. Sem sinal: só depois de 7 min sem leitura (o túnel passa sozinho)
        if (error.code === error.PERMISSION_DENIED) setDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    );
    const timer = window.setInterval(() => {
      setLost(Date.now() - (lastFix.current ?? startedAt) >= STALE_LOCATION_MS);
    }, CHECK_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(timer);
    };
  }, [ambulanceId, enabled, attempt]);

  const active = !!ambulanceId && enabled;
  return {
    problem: !active ? null : denied ? 'negado' : lost ? 'sem-sinal' : null,
    since: lastFix.current ?? startedAt,
    hadFix: lastFix.current !== null,
    retry: () => {
      setDenied(false);
      setStartedAt(Date.now());
      setAttempt(value => value + 1);
    }
  };
}
