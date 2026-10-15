import axios from 'axios';

// PED do CEMADEN: conta gratuita em ped.cemaden.gov.br; o token vale 1 h
const PED_URL = 'https://ped.cemaden.gov.br';
const TOKEN_TTL = 50 * 60_000; // renova antes de vencer

let cached: { token: string; expires: number } | null = null;

export const cemadenConfigured = () => !!process.env.CEMADEN_EMAIL && !!process.env.CEMADEN_PASSWORD;

async function token(): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.token;
  const response = await axios.post(
    `${PED_URL}/SGAA/rest/controle-token/tokens`,
    { email: process.env.CEMADEN_EMAIL, password: process.env.CEMADEN_PASSWORD },
    { timeout: 15000 }
  );
  if (!response.data?.token) throw new Error('CEMADEN: login recusado');
  cached = { token: response.data.token, expires: Date.now() + TOKEN_TTL };
  return cached.token;
}

export async function cemadenGet<T>(path: string, params: Record<string, unknown>): Promise<T> {
  const response = await axios.get(`${PED_URL}${path}`, { params, headers: { token: await token() }, timeout: 20000 });
  return response.data;
}
