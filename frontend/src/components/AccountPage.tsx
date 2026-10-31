import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage, getMe, ProfilePatch } from '../services/api';
import { AVATAR_BUCKET, supabase } from '../lib/supabase';
import { authErrorMessage } from '../auth/authErrors';
import { PasswordInput } from '../auth/PasswordInput';
import { AvatarColor, Me, ProfileField, UserRole } from '../types';
import { Avatar, AVATAR_COLORS, colorFromSeed } from '../ui/Avatar';
import { CheckIcon, CloseIcon, HidePasswordIcon, ShowPasswordIcon } from '../ui/icons';
import { useFocusTrap } from '../ui/useFocusTrap';
import { ThemePicker } from '../theme/ThemePicker';
import { formatCpf, formatPhone, isValidCellphone, isValidCpf, maskCpf, onlyDigits } from '../utils/documents';
import { useToast } from './Toast';
import { Spinner } from '../ui/Spinner';
import { squarePhoto } from '../utils/photo';
import { styles } from './AccountPage.styles';

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.OPERADOR]: 'Atendente da central',
  [UserRole.MOTORISTA]: 'Motorista'
};

const FIELD_LABEL: Record<ProfileField, string> = { cpf: 'CPF', phone: 'celular' };

// Dados pessoais (foto e cor salvam na hora, fora do "Editar")
interface Form {
  fullName: string;
  cpf: string;
  phone: string;
}

type Errors = Partial<Record<keyof Form, string>>;

const toForm = (profile: Me): Form => ({
  fullName: profile.fullName,
  cpf: formatCpf(profile.cpf ?? ''),
  phone: formatPhone(profile.phone ?? '')
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
  return { patch, errors };
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className={styles.field} data-invalid={error ? true : undefined}>
      <span>{label}</span>
      {children}
      {error ? <small className={styles.fieldError}>{error}</small> : hint && <small className={styles.hint}>{hint}</small>}
    </label>
  );
}

// Troca de senha sem a antiga: o código do app autenticador confirma que é a pessoa (e não alguém com o
// computador aberto)
function PasswordForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (next.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.');
    if (next !== confirm) return setError('As senhas novas não conferem.');
    if (!/^\d{6}$/.test(code)) return setError('Digite os 6 números do app autenticador.');
    setSaving(true);
    setError(null);
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find(item => item.status === 'verified');
      if (factorsError || !factor) throw factorsError ?? new Error('Sem app autenticador cadastrado.');
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (verifyError) {
        setError('Código incorreto. Confira o app autenticador.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        setError(authErrorMessage(updateError, 'Não foi possível trocar a senha.'));
        return;
      }
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
      <Field label="Nova senha (mínimo 8 caracteres)">
        <PasswordInput autoComplete="new-password" required autoFocus value={next} onChange={e => setNext(e.target.value)} />
      </Field>
      <Field label="Confirme a nova senha">
        <PasswordInput autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
      </Field>
      <Field label="Código do app autenticador" hint="Os 6 números que aparecem agora no app (Google Authenticator, Authy…).">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          required
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [initial, setInitial] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [profile, setProfile] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showCpf, setShowCpf] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const loaded = (fresh: Me) => {
    setProfile(fresh);
    setInitial(toForm(fresh));
    setForm(toForm(fresh));
  };

  // O CPF não fica no aparelho: busca o perfil completo ao abrir. Cadastro incompleto já abre editando
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(fresh => {
        if (cancelled) return;
        loaded(fresh);
        setEditing((fresh.missing ?? []).length > 0);
      })
      .catch(error => !cancelled && setLoadError(getErrorMessage(error, 'Sem conexão: não dá para abrir sua conta agora.')));
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = editing && !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial);
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

  const cancelEdit = () => {
    setForm(initial);
    setErrors({});
    setSaveError(null);
    setEditing(false);
  };

  const save = async () => {
    if (!form || !initial) return;
    const { patch, errors: found } = buildPatch(form, initial);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return setSaveError('Confira os campos destacados.');
    if (Object.keys(patch).length === 0) return setEditing(false);

    setSaving(true);
    setSaveError(null);
    try {
      loaded(await updateMe(patch));
      setEditing(false);
      toast('Dados salvos.', 'success');
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Não foi possível salvar.'));
    } finally {
      setSaving(false);
    }
  };

  // Foto e cor salvam na hora, sem o "Editar"
  const saveLook = async (patch: ProfilePatch, success: string) => {
    const fresh = await updateMe(patch);
    setProfile(fresh);
    toast(success, 'success');
  };

  const sendPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    const previous = profile?.avatarPhoto;
    try {
      const blob = await squarePhoto(file);
      const path = `${me.id}/${Date.now()}.${blob.type === 'image/png' ? 'png' : 'webp'}`;
      const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, { contentType: blob.type });
      if (error) throw error;
      await saveLook({ avatarPhoto: path }, 'Foto atualizada.');
      // A antiga sai do Storage; se falhar, só sobra um arquivo sem uso
      if (previous) void supabase.storage.from(AVATAR_BUCKET).remove([previous]);
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível enviar a foto. Tente outra imagem.'), 'error');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    const previous = profile?.avatarPhoto;
    if (!previous) return;
    setPhotoBusy(true);
    try {
      await saveLook({ avatarPhoto: null }, 'Foto removida.');
      void supabase.storage.from(AVATAR_BUCKET).remove([previous]);
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível remover a foto.'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const chooseColor = async (color: AvatarColor) => {
    if (!profile || color === (profile.avatarColor ?? colorFromSeed(profile.id))) return;
    try {
      await saveLook({ avatarColor: color }, 'Cor atualizada.');
    } catch (error) {
      toast(getErrorMessage(error, 'Não foi possível trocar a cor.'), 'error');
    }
  };

  const missing = profile?.missing ?? [];
  const color = profile ? profile.avatarColor ?? colorFromSeed(profile.id) : null;
  const photo = profile?.avatarPhoto ?? null;

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
          ) : !form || !initial || !profile ? (
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
                  <Avatar name={profile.fullName} seed={me.id} photo={photo} color={color} size={80} />
                </div>
                <div className={styles.photoActions}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={event => sendPhoto(event.target.files?.[0])}
                  />
                  <button type="button" className={styles.secondary} disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                    {photoBusy ? 'Enviando…' : photo ? 'Trocar foto' : 'Enviar foto'}
                  </button>
                  {photo && (
                    <button type="button" className={styles.secondary} disabled={photoBusy} onClick={removePhoto}>Remover foto</button>
                  )}
                </div>

                <p className={styles.label}>Cor</p>
                <div className={styles.colors} role="group" aria-label="Cor">
                  {(Object.keys(AVATAR_COLORS) as AvatarColor[]).map(key => (
                    <button
                      key={key}
                      type="button"
                      className={styles.color}
                      style={{ background: AVATAR_COLORS[key] }}
                      aria-pressed={color === key}
                      aria-label={key[0].toUpperCase() + key.slice(1)}
                      title={key[0].toUpperCase() + key.slice(1)}
                      onClick={() => chooseColor(key)}
                    >
                      {color === key && <CheckIcon />}
                    </button>
                  ))}
                </div>
                {photo && <p className={styles.hint}>A cor aparece com as iniciais, quando não há foto.</p>}
              </section>

              <section className={styles.section} aria-labelledby="account-personal">
                <div className={styles.sectionHeader}>
                  <h3 id="account-personal">Dados pessoais</h3>
                  {!editing && (
                    <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>Editar</button>
                  )}
                </div>

                {editing ? (
                  <>
                    <Field label="Nome completo" error={errors.fullName}>
                      <input autoComplete="name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                    </Field>
                    <Field label="CPF" error={errors.cpf} hint={missing.includes('cpf') ? 'Obrigatório' : undefined}>
                      <PasswordInput
                        secret="CPF"
                        autoComplete="off"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={e => set('cpf', formatCpf(e.target.value))}
                      />
                    </Field>
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
                    {saveError && <p className={styles.error} role="alert">{saveError}</p>}
                    <div className={styles.inlineActions}>
                      <button type="button" className={styles.secondary} disabled={saving} onClick={cancelEdit}>Cancelar</button>
                      <button type="button" className={styles.primary} disabled={saving || !dirty} onClick={save}>
                        {saving ? 'Salvando…' : 'Salvar alterações'}
                      </button>
                    </div>
                  </>
                ) : (
                  <dl className={styles.readonly}>
                    <div><dt>Nome</dt><dd>{initial.fullName}</dd></div>
                    <div>
                      <dt>CPF</dt>
                      <dd className={styles.secret}>
                        {initial.cpf ? (showCpf ? initial.cpf : maskCpf(initial.cpf)) : 'Não informado'}
                        {initial.cpf && (
                          <button
                            type="button"
                            className={styles.eye}
                            aria-pressed={showCpf}
                            aria-label={showCpf ? 'Ocultar CPF' : 'Mostrar CPF'}
                            title={showCpf ? 'Ocultar CPF' : 'Mostrar CPF'}
                            onClick={() => setShowCpf(value => !value)}
                          >
                            {/* Olho aberto: CPF à vista; fechado: oculto (como no campo de senha) */}
                            {showCpf ? <ShowPasswordIcon /> : <HidePasswordIcon />}
                          </button>
                        )}
                      </dd>
                    </div>
                    <div><dt>Celular</dt><dd>{initial.phone || 'Não informado'}</dd></div>
                  </dl>
                )}
              </section>

              <section className={styles.section} aria-labelledby="account-access">
                <h3 id="account-access">Acesso</h3>
                <dl className={styles.readonly}>
                  <div><dt>E-mail</dt><dd>{profile.email ?? '—'}</dd></div>
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
      </div>
    </div>
  );
}
