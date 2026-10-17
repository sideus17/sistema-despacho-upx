import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getErrorMessage, signUp } from '../services/api';
import { UserRole } from '../types';
import { AmbulanceIcon, HeadsetIcon } from '../ui/icons';
import { formatCpf, formatPhone, isValidCellphone, isValidCpf, onlyDigits } from '../utils/documents';
import { AuthLayout } from './AuthUI';
import styles from './auth.module.css';

const ROLES = [
  { value: UserRole.MOTORISTA, Icon: AmbulanceIcon, label: 'Motorista', description: 'Recebe despachos e navega até o local' },
  { value: UserRole.OPERADOR, Icon: HeadsetIcon, label: 'Atendente', description: 'Registra, regula e despacha chamados' }
];

export default function SignupScreen({ onLogin }: { onLogin: () => void }) {
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!role) return 'Escolha se você é motorista ou atendente.';
    if (fullName.trim().length < 3) return 'Informe o nome completo.';
    if (!isValidCpf(cpf)) return 'CPF inválido. Confira os números.';
    if (!isValidCellphone(phone)) return 'Celular inválido. Use DDD + número, ex.: (15) 99999-9999.';
    if (password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (password !== confirmPassword) return 'As senhas não conferem.';
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
        cpf: onlyDigits(cpf),
        phone: onlyDigits(phone),
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

        <label className={styles.field}>
          <span>Nome completo</span>
          <input autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>CPF</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            required
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Celular com DDD</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(15) 99999-9999"
            required
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
          <small className={styles.hint}>A central usa para falar com você durante o turno.</small>
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
