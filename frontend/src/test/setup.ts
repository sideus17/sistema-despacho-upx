import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cada teste começa com a tela e o armazenamento limpos
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});
