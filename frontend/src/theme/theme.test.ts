import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Em 15/10/2026 o sol se põe às 18h15 em Sorocaba (e nasce às 5h38)
const NOON = new Date('2026-10-15T12:00:00-03:00');
const NIGHT = new Date('2026-10-15T21:00:00-03:00');
const BEFORE_SUNSET = new Date('2026-10-15T18:00:00-03:00');

// O tema guarda estado no módulo: cada teste importa uma cópia nova, depois de preparar relógio e armazenamento
async function loadTheme() {
  vi.resetModules();
  return import('./theme');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOON);
  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '<meta name="theme-color" content="#2563eb">';
});

describe('tema do sistema', () => {
  it('automático segue o sol de Sorocaba', async () => {
    let theme = await loadTheme();
    expect(renderHook(() => theme.useTheme()).result.current).toEqual({ theme: 'day', preference: 'auto' });

    vi.setSystemTime(NIGHT);
    theme = await loadTheme();
    expect(renderHook(() => theme.useTheme()).result.current).toEqual({ theme: 'night', preference: 'auto' });
  });

  it('escurece sozinho no pôr do sol, sem recarregar a página', async () => {
    vi.setSystemTime(BEFORE_SUNSET);
    const { startDocumentTheme } = await loadTheme();
    startDocumentTheme();
    expect(document.documentElement.dataset.theme).toBe('day');

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#172554');
  });

  it('mantém a escolha antiga, de quando só o mapa tinha tema', async () => {
    localStorage.setItem('samu:tema-mapa', 'night');
    const theme = await loadTheme();
    expect(renderHook(() => theme.useTheme()).result.current).toEqual({ theme: 'night', preference: 'night' });

    theme.setThemePreference('day');
    expect(localStorage.getItem('samu:tema')).toBe('day');
    expect(localStorage.getItem('samu:tema-mapa')).toBeNull();
  });

  it('a troca vale para a tela inteira na hora', async () => {
    const { setThemePreference, startDocumentTheme, useTheme } = await loadTheme();
    startDocumentTheme();
    const { result } = renderHook(() => useTheme());

    act(() => setThemePreference('night'));
    expect(result.current.theme).toBe('night');
    expect(document.documentElement.dataset.theme).toBe('night');
  });

  it('só a escolha da pessoa é salva na conta, não o tema que veio dela', async () => {
    const { onThemeChoice, setThemePreference } = await loadTheme();
    const saveToAccount = vi.fn();
    const stop = onThemeChoice(saveToAccount);

    setThemePreference('night', { fromAccount: true });
    setThemePreference('night');
    expect(saveToAccount).not.toHaveBeenCalled(); // não mudou nada

    setThemePreference('day');
    expect(saveToAccount).toHaveBeenCalledWith('day');

    stop();
    setThemePreference('auto');
    expect(saveToAccount).toHaveBeenCalledTimes(1);
  });
});
