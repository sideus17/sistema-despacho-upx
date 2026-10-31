import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthLayout } from './AuthUI';
import { styles } from './authStyles';
import { authErrorMessage } from './authErrors';

// Marcador na volta do link do e-mail: o AuthGate sabe que é para criar uma senha nova
export const RECOVERY_PARAM = 'redefinir-senha';

/**
 * "Esqueci a senha": manda o link para criar uma senha nova. A resposta é a mesma com ou sem conta,
 * para não revelar quais e-mails estão cadastrados.
 */
export default function ForgotPasswordScreen({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/?${RECOVERY_PARAM}`
    });
    // Só falha de envio (limite, sem conexão) aparece: e-mail sem conta segue como se tivesse ido
    if (sendError && (sendError.status === 429 || !sendError.status || sendError.status >= 500)) {
      setError(authErrorMessage(sendError, 'Não foi possível enviar o link agora. Tente de novo.'));
    } else {
      setSent(true);
    }
    setSending(false);
  };

  if (sent) {
    return (
      <AuthLayout title="Confira seu e-mail">
        <p className={styles.notice} role="status">
          Se houver uma conta com <strong>{email.trim()}</strong>, enviamos um link para criar uma nova senha. Confira também o
          spam. O link vale por 1 hora.
        </p>
        <button className={styles.primary} onClick={onBack}>Voltar ao login</button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueci a senha" subtitle="Informe o e-mail da conta: enviamos um link para você criar uma senha nova.">
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>E-mail</span>
          <input type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button className={styles.primary} disabled={sending}>
          {sending ? 'Enviando…' : 'Enviar link'}
        </button>
      </form>

      <p className={styles.switch}>
        <button type="button" className={styles.link} onClick={onBack}>Voltar ao login</button>
      </p>
    </AuthLayout>
  );
}
