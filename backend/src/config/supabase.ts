import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
// As tabelas têm RLS sem políticas: só o backend acessa os dados, com a chave service_role
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no backend/.env');
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Para o log de início: deixa claro se o servidor está gravando no banco local ou no de produção
export function databaseLabel(): string {
  const host = new URL(supabaseUrl).hostname;
  return host === '127.0.0.1' || host === 'localhost' ? 'local (Supabase CLI)' : `PRODUÇÃO (${host})`;
}

// Cliente descartável para conferir a senha de alguém sem trocar a sessão do cliente acima
export function createVerifierClient() {
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
