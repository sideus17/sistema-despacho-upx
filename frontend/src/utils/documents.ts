// CPF, celular e CNH: mesmas regras do backend (backend/src/services/profile.ts), para avisar antes de enviar

export const CNH_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;

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

export function isValidCellphone(value: string): boolean {
  const phone = onlyDigits(value);
  return phone.length === 11 && DDDS.has(Number(phone.slice(0, 2))) && phone[2] === '9';
}

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

// Máscaras aplicadas enquanto a pessoa digita
export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const formatCnh = (value: string) => onlyDigits(value).slice(0, 11);

// CPF escondido como no gov.br: ***.982.247-**
export function maskCpf(cpf: string): string {
  const d = onlyDigits(cpf);
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '';
}

// AAAA-MM-DD já passou?
export function isExpired(date: string): boolean {
  const today = new Date();
  const local = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return date < local;
}
