import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// O jsdom não tem matchMedia: sem ele, toda media query responde "não" (tela larga, sem preferência)
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    }) as MediaQueryList;
}

// Cada teste começa com a tela e o armazenamento limpos
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});
