import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthLayout } from './AuthUI';
import styles from './auth.module.css';

export default function LoginScreen({ onSignup }: { onSignup: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // Sucesso: o AuthGate recebe o evento de login e segue para o MFA
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(signInError.message.includes('Invalid login credentials') ? 'E-mail ou senha incorretos.' : signInError.message);
    }
    setLoading(false);
  };

  return (
    <AuthLayout title="Entrar" subtitle="Acesse com sua conta da central ou da viatura.">
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>E-mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button className={styles.primary} disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className={styles.switch}>
        Ainda não tem conta?{' '}
        <button type="button" className={styles.link} onClick={onSignup}>Criar conta</button>
      </p>
    </AuthLayout>
  );
}
