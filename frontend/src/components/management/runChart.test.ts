import { describe, expect, it } from 'vitest';
import { medianOf, shiftPoints } from './charts';

describe('gráfico de corrida', () => {
  it('mediana de uma lista', () => {
    expect(medianOf([])).toBeNull();
    expect(medianOf([5, 1, 3])).toBe(3);
    expect(medianOf([4, 1, 3, 2])).toBe(2.5);
  });

  it('6 pontos seguidos do mesmo lado da mediana são um sinal; os em cima da mediana não quebram a sequência', () => {
    // Mediana 10: os 6 primeiros acima (com um 10 no meio, que não conta), depois abaixo
    const values = [12, 13, 10, 14, 11, 12, 15, 8, 7, 9];
    expect([...shiftPoints(values, 10)]).toEqual([0, 1, 3, 4, 5, 6]);
    // Só 5 seguidos: nada
    expect(shiftPoints([12, 13, 14, 11, 12, 8], 10).size).toBe(0);
  });
});
