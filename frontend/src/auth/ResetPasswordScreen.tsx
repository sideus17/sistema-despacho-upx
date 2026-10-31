import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { AuthLayout } from './AuthUI';
import { styles } from './authStyles';
import { authErrorMessage } from './authErrors';
import { PasswordInput } from './PasswordInput';

/**
 * Senha nova depois do link do e-mail (e do código do app autenticador): a sessão do link já vale para
 * trocar a senha, sem pedir a antiga.
 */
export default function ResetPasswordScreen({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(authErrorMessage(updateError, 'Não foi possível salvar a senha nova. Tente de novo.'));
      return;
    }
    toast('Senha alterada.', 'success');
    onDone();
  };

  return (
    <AuthLayout title="Criar senha nova" subtitle="Escolha a senha que você vai usar para entrar daqui em diante.">
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Nova senha (mínimo 8 caracteres)</span>
          <PasswordInput autoComplete="new-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Confirme a nova senha</span>
          <PasswordInput autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button className={styles.primary} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar senha nova'}
        </button>
      </form>

      <p className={styles.switch}>
        <button type="button" className={styles.link} onClick={onCancel}>Cancelar e sair</button>
      </p>
    </AuthLayout>
  );
}
