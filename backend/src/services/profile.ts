import { UserRole } from '../types';

// Valores aceitos (iguais às regras da migração 003)
export const CNH_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;
export const AVATAR_ICONS = ['medico', 'medica', 'enfermagem', 'socorrista', 'homem', 'mulher', 'pessoa'] as const;
export const AVATAR_COLORS = ['azul', 'verde', 'vermelho', 'laranja', 'roxo', 'turquesa', 'rosa', 'grafite'] as const;
export const THEMES = ['auto', 'day', 'night'] as const;

// DDDs em uso no Brasil (Anatel)
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99
]);

export const onlyDigits = (value: string) => value.replace(/\D/g, '');
const allSame = (digits: string) => /^(\d)\1*$/.test(digits);

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || allSame(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

// Celular com DDD: 11 dígitos, começando por 9 depois do DDD
export function isValidCellphone(value: string): boolean {
  const phone = onlyDigits(value);
  return phone.length === 11 && DDDS.has(Number(phone.slice(0, 2))) && phone[2] === '9';
}

// Número de registro da CNH (11 dígitos, dois verificadores; algoritmo do Denatran)
export function isValidCnh(value: string): boolean {
  const cnh = onlyDigits(value);
  if (cnh.length !== 11 || allSame(cnh)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cnh[i]) * (9 - i);
  let first = sum % 11;
  let discount = 0;
  if (first >= 10) {
    first = 0;
    discount = 2;
  }
  sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cnh[i]) * (i + 1);
  const rest = sum % 11;
  const second = rest >= 10 ? 0 : rest - discount;
  return second >= 0 && `${first}${second}` === cnh.slice(9);
}

// AAAA-MM-DD que existe no calendário (recusa 2026-02-30)
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export class ProfileError extends Error {}

export interface Cnh {
  number: string;
  category: string;
  expiresOn: string; // AAAA-MM-DD
}

export function parseCnh(input: unknown): Cnh {
  const cnh = (input ?? {}) as Record<string, unknown>;
  const number = typeof cnh.number === 'string' ? onlyDigits(cnh.number) : '';
  const category = typeof cnh.category === 'string' ? cnh.category.trim().toUpperCase() : '';
  const expiresOn = typeof cnh.expiresOn === 'string' ? cnh.expiresOn : '';
  if (!isValidCnh(number)) throw new ProfileError('Número da CNH inválido. Confira os 11 dígitos.');
  if (!(CNH_CATEGORIES as readonly string[]).includes(category)) throw new ProfileError('Categoria da CNH inválida.');
  if (!isValidDate(expiresOn) || expiresOn < '2000-01-01' || expiresOn > '2100-12-31') {
    throw new ProfileError('Validade da CNH inválida.');
  }
  return { number, category, expiresOn };
}

export function parseName(input: unknown): string {
  const name = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 3 || name.length > 120) throw new ProfileError('Informe o nome completo.');
  return name;
}

export function parseCpf(input: unknown): string {
  const cpf = typeof input === 'string' ? onlyDigits(input) : '';
  if (!isValidCpf(cpf)) throw new ProfileError('CPF inválido. Confira os números.');
  return cpf;
}

export function parsePhone(input: unknown): string {
  const phone = typeof input === 'string' ? onlyDigits(input) : '';
  if (!isValidCellphone(phone)) throw new ProfileError('Celular inválido. Use DDD + número, ex.: (15) 99999-9999.');
  return phone;
}

function parseChoice<T extends string>(input: unknown, options: readonly T[], message: string): T | null {
  if (input === null) return null;
  if (typeof input === 'string' && (options as readonly string[]).includes(input)) return input as T;
  throw new ProfileError(message);
}

// Linha da tabela profiles (colunas da migração 003 podem faltar se ela ainda não rodou)
export interface ProfileRow {
  id: string;
  full_name: string;
  role: UserRole;
  cpf?: string | null;
  phone?: string | null;
  cnh_number?: string | null;
  cnh_category?: string | null;
  cnh_expires_on?: string | null;
  avatar?: string | null;
  avatar_color?: string | null;
  theme?: string | null;
}

/**
 * Converte o corpo do PATCH /me em colunas. Só os campos enviados mudam;
 * CPF, celular e CNH (motorista) não podem ser apagados, só trocados.
 */
export function profileUpdate(body: Record<string, unknown>, role: UserRole): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  if ('fullName' in body) update.full_name = parseName(body.fullName);
  if ('cpf' in body) update.cpf = parseCpf(body.cpf);
  if ('phone' in body) update.phone = parsePhone(body.phone);
  if ('cnh' in body) {
    if (role !== UserRole.MOTORISTA) throw new ProfileError('CNH só é pedida para motoristas.');
    const cnh = parseCnh(body.cnh);
    update.cnh_number = cnh.number;
    update.cnh_category = cnh.category;
    update.cnh_expires_on = cnh.expiresOn;
  }
  if ('avatar' in body) update.avatar = parseChoice(body.avatar, AVATAR_ICONS, 'Figura inválida.');
  if ('avatarColor' in body) update.avatar_color = parseChoice(body.avatarColor, AVATAR_COLORS, 'Cor inválida.');
  if ('theme' in body) {
    const theme = parseChoice(body.theme, THEMES, 'Tema inválido.');
    if (!theme) throw new ProfileError('Tema inválido.');
    update.theme = theme;
  }
  if (Object.keys(update).length === 0) throw new ProfileError('Nada para alterar.');
  return update;
}

// O que falta no cadastro (contas criadas antes de CPF e celular serem pedidos)
export function missingFields(row: ProfileRow): string[] {
  const missing: string[] = [];
  if (!row.cpf) missing.push('cpf');
  if (!row.phone) missing.push('phone');
  if (row.role === UserRole.MOTORISTA && !row.cnh_number) missing.push('cnh');
  return missing;
}

// Perfil completo, só para a própria pessoa
export function toMe(row: ProfileRow, email: string | undefined) {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    email: email ?? null,
    cpf: row.cpf ?? null,
    phone: row.phone ?? null,
    cnh: row.cnh_number
      ? { number: row.cnh_number, category: row.cnh_category ?? '', expiresOn: row.cnh_expires_on ?? '' }
      : null,
    avatar: row.avatar ?? null,
    avatarColor: row.avatar_color ?? null,
    theme: row.theme ?? 'auto',
    missing: missingFields(row)
  };
}

// CPF ou CNH já usados por outra conta (índice único do banco)
export function duplicateMessage(error: { code?: string; message?: string } | null): string | null {
  if (error?.code !== '23505') return null;
  if (error.message?.includes('cnh')) return 'Esta CNH já está cadastrada em outra conta.';
  if (error.message?.includes('cpf')) return 'Este CPF já está cadastrado em outra conta.';
  return 'Estes dados já estão cadastrados em outra conta.';
}
