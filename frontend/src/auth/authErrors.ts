// Erros do login do Supabase em português: o texto que vem dele (em inglês) não vai para a tela
export function authErrorMessage(error: { message?: string; status?: number } | null | undefined, fallback: string): string {
  const text = (error?.message ?? '').toLowerCase();
  if (text.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (text.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar.';
  if (text.includes('already registered') || text.includes('already exists')) return 'Já existe uma conta com este e-mail.';
  if (text.includes('expired') || text.includes('otp_expired') || text.includes('invalid or has expired')) {
    return 'O link venceu. Peça outro em "Esqueci a senha".';
  }
  if (text.includes('same password') || text.includes('different from the old')) return 'A senha nova precisa ser diferente da atual.';
  if (text.includes('weak') || text.includes('password should')) return 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.';
  if (error?.status === 429 || text.includes('rate limit') || text.includes('too many')) {
    return 'Muitas tentativas seguidas. Espere um pouco e tente de novo.';
  }
  if (text.includes('failed to fetch') || text.includes('network') || text.includes('load failed')) {
    return 'Sem conexão com o servidor. Tente novamente.';
  }
  return fallback;
}
