import { describe, expect, it } from 'vitest';
import { CallPriority } from '../types';
import { signalsText, suggestPriority } from './triage';

describe('classificação de risco pelos sinais', () => {
  it('vale a cor mais grave entre os sinais marcados', () => {
    expect(suggestPriority(['FEBRE', 'FALTA_AR'])).toBe(CallPriority.URGENTE);
    expect(suggestPriority(['FEBRE', 'DOR_PEITO', 'FALTA_AR'])).toBe(CallPriority.EMERGENCIA);
    expect(suggestPriority(['VOMITO'])).toBe(CallPriority.PRIORITARIO);
  });

  it('sem sinal (ou só código desconhecido), não sugere nada', () => {
    expect(suggestPriority([])).toBeNull();
    expect(suggestPriority(['INVENTADO'])).toBeNull();
  });

  it('texto dos sinais para o card e para a equipe', () => {
    expect(signalsText(['DOR_PEITO', 'INVENTADO', 'FALTA_AR'])).toBe('Dor forte no peito, Falta de ar');
    expect(signalsText()).toBe('');
  });
});
