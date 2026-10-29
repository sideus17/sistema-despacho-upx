import { useSyncExternalStore } from 'react';
import { isNight } from '../map/sun';
import { AutoThemeIcon, DayIcon, IconComponent, NightIcon } from '../ui/icons';
import { installRiskTokens } from './riskTokens';

export type Theme = 'day' | 'night';
export type ThemePreference = 'auto' | Theme;

export const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: IconComponent }[] = [
  { value: 'auto', label: 'Automático', Icon: AutoThemeIcon },
  { value: 'day', label: 'Claro', Icon: DayIcon },
  { value: 'night', label: 'Escuro', Icon: NightIcon }
];

const STORAGE_KEY = 'samu:tema';
const LEGACY_KEY = 'samu:tema-mapa'; // quando só o mapa tinha tema
const SOROCABA = { lat: -23.5015, lng: -47.4526 };
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
// Cor da barra do navegador no celular, igual ao topo do app (--color-header)
const BROWSER_BAR: Record<Theme, string> = { day: '#111827', night: '#0b1120' };

const isPreference = (value: unknown): value is ThemePreference => value === 'auto' || value === 'day' || value === 'night';

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    return isPreference(saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

const sunTheme = (): Theme => (isNight(new Date(), SOROCABA.lat, SOROCABA.lng) ? 'night' : 'day');

// Escolha do aparelho, compartilhada pelo app inteiro
let preference = readPreference();
let sun = sunTheme();
let snapshot = { theme: preference === 'auto' ? sun : preference, preference };
const listeners = new Set<() => void>();
const choiceListeners = new Set<(preference: ThemePreference) => void>();

function emit() {
  const theme = preference === 'auto' ? sun : preference;
  if (theme === snapshot.theme && preference === snapshot.preference) return;
  snapshot = { theme, preference };
  listeners.forEach(listener => listener());
}

// fromAccount: tema que veio da conta ao entrar (não é salvo de volta)
export function setThemePreference(next: ThemePreference, { fromAccount = false } = {}) {
  const changed = next !== preference;
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Vale só nesta sessão
  }
  emit();
  if (changed && !fromAccount) choiceListeners.forEach(listener => listener(next));
}

// Escolha feita pela pessoa (menu, navegação), para salvar na conta
export function onThemeChoice(listener: (preference: ThemePreference) => void) {
  choiceListeners.add(listener);
  return () => {
    choiceListeners.delete(listener);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Como o "Automático" do Waze: escurece no pôr do sol e clareia no nascer
export function useTheme(): { theme: Theme; preference: ThemePreference } {
  return useSyncExternalStore(subscribe, () => snapshot);
}

function applyToDocument() {
  const root = document.documentElement;
  root.dataset.theme = snapshot.theme;
  root.style.colorScheme = snapshot.theme === 'night' ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_BAR[snapshot.theme]);
}

// Chamado uma vez, antes do primeiro desenho, para a tela não piscar clara à noite
export function startDocumentTheme() {
  installRiskTokens();
  applyToDocument();
  subscribe(applyToDocument);

  const checkSun = () => {
    sun = sunTheme();
    emit();
  };
  window.setInterval(checkSun, CHECK_INTERVAL_MS);
  // O celular pode passar horas com a tela apagada: reavalia ao voltar
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkSun());
}
