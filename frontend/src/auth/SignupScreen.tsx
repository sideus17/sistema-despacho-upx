import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getErrorMessage, signUp } from '../services/api';
import { UserRole } from '../types';
import { AmbulanceIcon, HeadsetIcon } from '../ui/icons';
import { AuthLayout } from './AuthUI';
import styles from './auth.module.css';

const ROLES = [
  { value: UserRole.MOTORISTA, Icon: AmbulanceIcon, label: 'Motorista', description: 'Recebe despachos e navega até o local' },
  { value: UserRole.OPERADOR, Icon: HeadsetIcon, label: 'Operador', description: 'Abre chamados e despacha viaturas' }
];

export default function SignupScreen({ onLogin }: { onLogin: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (fullName.trim().length < 3) return 'Informe o nome completo.';
    if (password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (password !== confirmPassword) return 'As senhas não conferem.';
    if (!role) return 'Escolha se você é motorista ou operador.';
    if (role === UserRole.OPERADOR && !inviteCode.trim()) return 'Informe o código da central.';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: role!,
        inviteCode: role === UserRole.OPERADOR ? inviteCode.trim() : undefined
      });
      // Conta criada: entra direto, e o AuthGate leva para o cadastro do MFA
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível criar a conta.'));
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Criar conta" subtitle="Depois do cadastro você vai ativar a verificação em duas etapas.">
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Nome completo</span>
          <input autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>E-mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Senha (mínimo 8 caracteres)</span>
          <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Confirme a senha</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>

        <fieldset className={styles.roles}>
          <legend>Você é</legend>
          {ROLES.map(option => (
            <label key={option.value} className={`${styles.roleCard} ${role === option.value ? styles.roleCardSelected : ''}`}>
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
              />
              <span className={styles.roleIcon}><option.Icon /></span>
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </fieldset>

        {role === UserRole.OPERADOR && (
          <label className={styles.field}>
            <span>Código da central</span>
            <input
              autoComplete="off"
              autoCapitalize="characters"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <small className={styles.hint}>Peça o código ao responsável pela central de regulação.</small>
          </label>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button className={styles.primary} disabled={loading}>
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p className={styles.switch}>
        Já tem conta?{' '}
        <button type="button" className={styles.link} onClick={onLogin}>Entrar</button>
      </p>
    </AuthLayout>
  );
}
