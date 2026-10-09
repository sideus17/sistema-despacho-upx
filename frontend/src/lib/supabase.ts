import { createClient } from '@supabase/supabase-js';

// Só a autenticação usa o Supabase direto; os dados passam pelo backend (as tabelas têm RLS).
// A anon key é pública por definição: sozinha ela não dá acesso às tabelas.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// Chave padrão em que o supabase-js guarda a sessão no aparelho
const SESSION_KEY = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

// Sem sinal o supabase-js não consegue encerrar a sessão no servidor e a mantém salva:
// apaga só deste aparelho para o "Sair" funcionar mesmo offline
export function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Sem armazenamento não há sessão salva
  }
}
