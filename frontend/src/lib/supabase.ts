import { createClient } from '@supabase/supabase-js';

// Em desenvolvimento com o banco local a URL é relativa (/supabase, pelo proxy do Vite): assim
// funciona também no celular pelo ngrok. Na produção é a URL completa do projeto hospedado.
const SUPABASE_URL = new URL(import.meta.env.VITE_SUPABASE_URL, window.location.origin).href.replace(/\/$/, '');

// Só a autenticação usa o Supabase direto; os dados passam pelo backend (as tabelas têm RLS).
// A anon key é pública por definição: sozinha ela não dá acesso às tabelas.
export const supabase = createClient(SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// Chave padrão em que o supabase-js guarda a sessão no aparelho
const SESSION_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

// Sem sinal o supabase-js não consegue encerrar a sessão no servidor e a mantém salva:
// apaga só deste aparelho para o "Sair" funcionar mesmo offline
export function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Sem armazenamento não há sessão salva
  }
}
