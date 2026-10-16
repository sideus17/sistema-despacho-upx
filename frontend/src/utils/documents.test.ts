import { describe, expect, it } from 'vitest';
import { formatCpf, formatPhone, isValidCellphone, isValidCpf, isValidPhone, maskCpf } from './documents';

describe('CPF', () => {
  it('confere os dígitos verificadores', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
  });

  it('formata enquanto a pessoa digita', () => {
    expect(formatCpf('529')).toBe('529');
    expect(formatCpf('5299')).toBe('529.9');
    expect(formatCpf('5299822')).toBe('529.982.2');
    expect(formatCpf('52998224725999')).toBe('529.982.247-25');
  });

  it('esconde o começo e o fim, como no gov.br', () => {
    expect(maskCpf('52998224725')).toBe('***.982.247-**');
    expect(maskCpf('123')).toBe('');
  });
});

describe('celular', () => {
  it('aceita só celular com DDD existente', () => {
    expect(isValidCellphone('(15) 99123-4567')).toBe(true);
    expect(isValidCellphone('(15) 3212-3456')).toBe(false); // fixo
    expect(isValidCellphone('(20) 99123-4567')).toBe(false); // DDD 20 não existe
  });

  it('formata com DDD entre parênteses', () => {
    expect(formatPhone('15')).toBe('(15');
    expect(formatPhone('15991')).toBe('(15) 991');
    expect(formatPhone('15991234567')).toBe('(15) 99123-4567');
  });

  it('fixo em 4-4, sem passar de 10 dígitos', () => {
    expect(formatPhone('153232')).toBe('(15) 3232');
    expect(formatPhone('1532321234')).toBe('(15) 3232-1234');
    expect(formatPhone('15323212345')).toBe('(15) 3232-1234');
  });
});

describe('telefone de quem liga', () => {
  it('aceita celular com 9 e fixo de 2 a 5', () => {
    expect(isValidPhone('(15) 99123-4567')).toBe(true);
    expect(isValidPhone('(15) 3232-1234')).toBe(true);
    expect(isValidPhone('(15) 9123-4567')).toBe(false);
    expect(isValidPhone('(20) 3232-1234')).toBe(false);
    expect(isValidPhone('(15) 3232-123')).toBe(false);
  });
});
