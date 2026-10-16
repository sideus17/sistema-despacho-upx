import { describe, expect, it } from 'vitest';
import { minutesScale } from './charts';
import { formatMinutes, formatPercent, formatWeekday, niceMax, periodRange } from './format';

describe('números da gestão', () => {
  it('minutos com uma casa; de 1 h para cima, horas e minutos', () => {
    expect(formatMinutes(612)).toBe('10,2 min');
    expect(formatMinutes(60)).toBe('1,0 min');
    expect(formatMinutes(3900)).toBe('1 h 05 min');
    expect(formatMinutes(null)).toBe('—');
  });

  it('porcentagem inteira; sem dados, travessão', () => {
    expect(formatPercent(0.7596)).toBe('76%');
    expect(formatPercent(null)).toBe('—');
  });

  it('topo da escala: o próximo número redondo', () => {
    expect(niceMax(11)).toBe(12);
    expect(niceMax(10)).toBe(10);
    expect(niceMax(7)).toBe(8);
    expect(niceMax(130)).toBe(150);
    expect(niceMax(0)).toBe(1);
  });

  it('escala de tempo: de 5 em 5 min até 30, de 10 em 10 até 60, depois de 30 em 30', () => {
    expect(minutesScale(22 * 60)).toBe(25);
    expect(minutesScale(60 * 60)).toBe(60);
    expect(minutesScale(41 * 60)).toBe(50);
    expect(minutesScale(70 * 60)).toBe(90);
  });

  it('dia da semana e data', () => {
    expect(formatWeekday('2026-10-16')).toMatch(/^sex\.?, 16\/10$/);
  });
});

describe('período', () => {
  const now = new Date(2026, 9, 16, 15, 30).getTime();

  it('hoje começa à meia-noite; 7 dias inclui hoje e os 6 anteriores', () => {
    expect(new Date(periodRange('hoje', now).from)).toEqual(new Date(2026, 9, 16, 0, 0));
    expect(new Date(periodRange('7d', now).from)).toEqual(new Date(2026, 9, 10, 0, 0));
    expect(periodRange('30d', now).to).toBe(new Date(now).toISOString());
  });
});
