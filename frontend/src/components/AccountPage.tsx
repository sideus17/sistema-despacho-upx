import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { changePassword, getErrorMessage, getMe, ProfilePatch } from '../services/api';
import { AvatarColor, AvatarIcon, Me, ProfileField, UserRole } from '../types';
import { Avatar, AVATAR_COLORS, AVATAR_ICONS, colorFromSeed } from '../ui/Avatar';
import { CheckIcon, CloseIcon } from '../ui/icons';
import { useFocusTrap } from '../ui/useFocusTrap';
import { ThemePicker } from '../theme/ThemePicker';
import { formatCpf, formatPhone, isValidCellphone, isValidCpf, maskCpf, onlyDigits } from '../utils/documents';
import { useToast } from './Toast';
import { Spinner } from '../ui/Spinner';
import styles from './AccountPage.module.css';

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.OPERADOR]: 'Atendente da central',
  [UserRole.MOTORISTA]: 'Motorista'
};

const FIELD_LABEL: Record<ProfileField, string> = { cpf: 'CPF', phone: 'celular' };

interface Form {
  fullName: string;
  cpf: string;
  phone: string;
  avatar: AvatarIcon | null;
  avatarColor: AvatarColor;
}

type Errors = Partial<Record<keyof Form, string>>;

const toForm = (profile: Me): Form => ({
  fullName: profile.fullName,
  cpf: formatCpf(profile.cpf ?? ''),
  phone: formatPhone(profile.phone ?? ''),
  avatar: profile.avatar ?? null,
  avatarColor: profile.avatarColor ?? colorFromSeed(profile.id)
});

const listJoin = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

// Só o que mudou vai para o servidor; campo vazio que já era vazio não é cobrado
function buildPatch(form: Form, initial: Form): { patch: ProfilePatch; errors: Errors } {
  const patch: ProfilePatch = {};
  const errors: Errors = {};

  const name = form.fullName.trim().replace(/\s+/g, ' ');
  if (name !== initial.fullName) {
    if (name.length < 3) errors.fullName = 'Informe o nome completo.';
    else patch.fullName = name;
  }
  if (form.cpf !== initial.cpf) {
    if (!isValidCpf(form.cpf)) errors.cpf = 'CPF inválido. Confira os números.';
    else patch.cpf = onlyDigits(form.cpf);
  }
  if (form.phone !== initial.phone) {
    if (!isValidCellphone(form.phone)) errors.phone = 'Celular inválido. Use DDD + número, ex.: (15) 99999-9999.';
    else patch.phone = onlyDigits(form.phone);
  }
  if (form.avatar !== initial.avatar) patch.avatar = form.avatar;
  if (form.avatarColor !== initial.avatarColor) patch.avatarColor = form.avatarColor;
  return { patch, errors };
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {error ? <small className={styles.fieldError}>{error}</small> : hint && <small className={styles.hint}>{hint}</small>}
    </label>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (next.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.');
    if (next !== confirm) return setError('As senhas novas não conferem.');
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast('Senha alterada.', 'success');
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível trocar a senha.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.passwordForm} onSubmit={submit}>
      <Field label="Senha atual">
        <input type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} />
      </Field>
      <Field label="Nova senha (mínimo 8 caracteres)">
        <input type="password" autoComplete="new-password" required value={next} onChange={e => setNext(e.target.value)} />
      </Field>
      <Field label="Confirme a nova senha">
        <input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
      </Field>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.inlineActions}>
        <button type="button" className={styles.secondary} disabled={saving} onClick={onDone}>Cancelar</button>
        <button className={styles.primary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar nova senha'}</button>
      </div>
    </form>
  );
}

// "Gerenciar sua conta": foto, dados pessoais, acesso e aparência
export function AccountPage({ onClose }: { onClose: () => void }) {
  const { me, updateMe } = useAuth();
  const toast = useToast();
  const pageRef = useRef<HTMLDivElement>(null);
  const [initial, setInitial] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [profile, setProfile] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCpf, setShowCpf] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);


  // O CPF não fica no aparelho: busca o perfil completo ao abrir
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(fresh => {
        if (cancelled) return;
        setProfile(fresh);
        setInitial(toForm(fresh));
        setForm(toForm(fresh));
      })
      .catch(error => !cancelled && setLoadError(getErrorMessage(error, 'Sem conexão: não dá para abrir sua conta agora.')));
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial);
  const requestClose = () => {
    if (dirty && !window.confirm('Descartar as alterações?')) return;
    onClose();
  };
  useFocusTrap(pageRef, true, requestClose);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(current => (current ? { ...current, [key]: value } : current));
    setErrors(current => ({ ...current, [key]: undefined }));
    setSaveError(null);
  };

  const save = async () => {
    if (!form || !initial) return;
    const { patch, errors: found } = buildPatch(form, initial);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return setSaveError('Confira os campos destacados.');
    if (Object.keys(patch).length === 0) return onClose();

    setSaving(true);
    setSaveError(null);
    try {
      await updateMe(patch);
      toast('Perfil atualizado.', 'success');
      onClose();
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Não foi possível salvar.'));
      setSaving(false);
    }
  };

  const missing = profile?.missing ?? [];

  return (
    <div className={styles.backdrop} onMouseDown={event => event.target === event.currentTarget && requestClose()}>
      <div ref={pageRef} className={styles.page} role="dialog" aria-modal="true" aria-labelledby="account-title">
        <header className={styles.header}>
          <button className={styles.close} onClick={requestClose} aria-label="Fechar"><CloseIcon /></button>
          <h2 id="account-title">Sua conta</h2>
        </header>

        <div className={styles.body}>
          {loadError ? (
            <p className={styles.error} role="alert">{loadError}</p>
          ) : !form ? (
            <Spinner className={styles.spinner} />
          ) : (
            <>
              {missing.length > 0 && (
                <p className={styles.missing} role="status">
                  Complete seu cadastro: falta{missing.length > 1 ? 'm' : ''} {listJoin(missing.map(field => FIELD_LABEL[field]))}.
                </p>
              )}

              <section className={styles.section} aria-labelledby="account-photo">
                <h3 id="account-photo">Foto do perfil</h3>
                <div className={styles.preview}>
                  <Avatar name={form.fullName || me.fullName} seed={me.id} icon={form.avatar} color={form.avatarColor} size={80} />
                </div>

                <p className={styles.label}>Figura</p>
                <div className={styles.figures} role="group" aria-label="Figura">
                  <button
                    type="button"
                    className={styles.figure}
                    aria-pressed={form.avatar === null}
                    aria-label="Iniciais"
                    title="Iniciais"
                    onClick={() => set('avatar', null)}
                  >
                    <Avatar name={form.fullName || me.fullName} seed={me.id} color={form.avatarColor} size={44} />
                  </button>
                  {(Object.keys(AVATAR_ICONS) as AvatarIcon[]).map(key => (
                    <button
                      key={key}
                      type="button"
                      className={styles.figure}
                      aria-pressed={form.avatar === key}
                      aria-label={AVATAR_ICONS[key].label}
                      title={AVATAR_ICONS[key].label}
                      onClick={() => set('avatar', key)}
                    >
                      <Avatar name={me.fullName} seed={me.id} icon={key} color={form.avatarColor} size={44} />
                    </button>
                  ))}
                </div>

                <p className={styles.label}>Cor</p>
                <div className={styles.colors} role="group" aria-label="Cor">
                  {(Object.keys(AVATAR_COLORS) as AvatarColor[]).map(key => (
                    <button
                      key={key}
                      type="button"
                      className={styles.color}
                      style={{ background: AVATAR_COLORS[key] }}
                      aria-pressed={form.avatarColor === key}
                      aria-label={key[0].toUpperCase() + key.slice(1)}
                      title={key[0].toUpperCase() + key.slice(1)}
                      onClick={() => set('avatarColor', key)}
                    >
                      {form.avatarColor === key && <CheckIcon />}
                    </button>
                  ))}
                </div>
              </section>

              <section className={styles.section} aria-labelledby="account-personal">
                <h3 id="account-personal">Dados pessoais</h3>
                <Field label="Nome completo" error={errors.fullName}>
                  <input autoComplete="name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                </Field>

                {initial?.cpf && !showCpf ? (
                  <div className={styles.field}>
                    <span>CPF</span>
                    <div className={styles.masked}>
                      <span>{maskCpf(initial.cpf)}</span>
                      <button type="button" className={styles.link} onClick={() => setShowCpf(true)}>Mostrar</button>
                    </div>
                  </div>
                ) : (
                  <Field label="CPF" error={errors.cpf} hint={missing.includes('cpf') ? 'Obrigatório' : undefined}>
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={e => set('cpf', formatCpf(e.target.value))}
                    />
                  </Field>
                )}

                <Field label="Celular" error={errors.phone} hint={missing.includes('phone') ? 'Obrigatório' : undefined}>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(15) 99999-9999"
                    value={form.phone}
                    onChange={e => set('phone', formatPhone(e.target.value))}
                  />
                </Field>
              </section>

              <section className={styles.section} aria-labelledby="account-access">
                <h3 id="account-access">Acesso</h3>
                <dl className={styles.readonly}>
                  <div><dt>E-mail</dt><dd>{profile?.email ?? '—'}</dd></div>
                  <div><dt>Função</dt><dd>{ROLE_LABEL[me.role]}</dd></div>
                </dl>
                {changingPassword ? (
                  <PasswordForm onDone={() => setChangingPassword(false)} />
                ) : (
                  <button type="button" className={styles.secondary} onClick={() => setChangingPassword(true)}>Alterar senha</button>
                )}
              </section>

              <section className={styles.section} aria-labelledby="account-theme">
                <h3 id="account-theme">Aparência</h3>
                <ThemePicker />
                <p className={styles.hint}>O automático escurece no pôr do sol em Sorocaba. Vale em todos os seus aparelhos.</p>
              </section>
            </>
          )}
        </div>

        {form && (
          <footer className={styles.footer}>
            {saveError && <p className={styles.error} role="alert">{saveError}</p>}
            <div className={styles.inlineActions}>
              <button type="button" className={styles.secondary} disabled={saving} onClick={requestClose}>Cancelar</button>
              <button type="button" className={styles.primary} disabled={saving || !dirty} onClick={save}>
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
