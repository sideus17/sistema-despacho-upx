import { useEffect, useState, useSyncExternalStore } from 'react';
import { MapTheme } from './mapStyle';
import { isNight } from './sun';

export type ThemePreference = 'auto' | MapTheme;

const STORAGE_KEY = 'samu:tema-mapa';
const SOROCABA = { lat: -23.5015, lng: -47.4526 };
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'day' || saved === 'night' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

// Escolha do aparelho, compartilhada por todos os mapas abertos
let preference = readPreference();
const listeners = new Set<() => void>();

export function setThemePreference(next: ThemePreference) {
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Vale só nesta sessão
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const sunTheme = (): MapTheme => (isNight(new Date(), SOROCABA.lat, SOROCABA.lng) ? 'night' : 'day');

// Como o "Automático" do Waze: escurece no pôr do sol e clareia no nascer
export function useMapTheme(): { theme: MapTheme; preference: ThemePreference } {
  const current = useSyncExternalStore(subscribe, () => preference);
  const [auto, setAuto] = useState(sunTheme);

  useEffect(() => {
    const update = () => setAuto(sunTheme());
    // O celular pode passar horas com a tela apagada: reavalia ao voltar
    const handleVisibility = () => document.visibilityState === 'visible' && update();
    const timer = window.setInterval(update, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { theme: current === 'auto' ? auto : current, preference: current };
}
