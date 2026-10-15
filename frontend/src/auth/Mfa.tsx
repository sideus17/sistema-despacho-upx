import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthLayout, CodeInput } from './AuthUI';
import styles from './auth.module.css';

const INVALID_CODE = 'Código inválido. Confira se o horário do celular está automático e tente de novo.';

// Sucesso nos dois fluxos: o AuthGate recebe MFA_CHALLENGE_VERIFIED e entra no app

export function MfaEnroll({ onCancel }: { onCancel: () => void }) {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      // Descarta cadastros de MFA que ficaram pela metade (a pessoa saiu antes de confirmar)
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const old of factors?.all ?? []) {
        if (old.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: old.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'SAMU Despacho',
        friendlyName: `SAMU ${Date.now()}`
      });
      if (enrollError || !data) {
        setError(enrollError?.message ?? 'Não foi possível iniciar o cadastro do MFA.');
        return;
      }
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri });
    })();
  }, []);

  const verify = async (value: string) => {
    if (!factor || value.length !== 6) return;
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: value });
    if (verifyError) {
      setError(INVALID_CODE);
      setCode('');
    }
    setVerifying(false);
  };

  const copySecret = async () => {
    if (!factor) return;
    try {
      await navigator.clipboard.writeText(factor.secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AuthLayout title="Proteja sua conta" subtitle="A verificação em duas etapas é obrigatória para acessar o sistema.">
      <ol className={styles.steps}>
        <li>
          Instale um app autenticador no celular: <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> ou similar.
        </li>
        <li>
          Adicione o SAMU no app.
          {factor ? (
            <div className={styles.enroll}>
              {/* No celular não dá para escanear a própria tela: o link abre o autenticador direto */}
              <a className={styles.secondary} href={factor.uri}>Abrir no app autenticador</a>
              <img className={styles.qr} src={factor.qr} alt="QR code para o app autenticador" />
              <p className={styles.hint}>No computador, escaneie o QR code com o celular.</p>
              <div className={styles.secret}>
                <code>{factor.secret}</code>
                <button type="button" className={styles.link} onClick={copySecret}>{copied ? 'Copiada' : 'Copiar chave'}</button>
              </div>
            </div>
          ) : (
            !error && <div className={styles.spinner} />
          )}
        </li>
        <li>Digite o código de 6 dígitos que aparece no app.</li>
      </ol>

      <CodeInput value={code} onChange={setCode} onComplete={verify} disabled={!factor || verifying} />
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.primary} disabled={!factor || verifying || code.length !== 6} onClick={() => verify(code)}>
        {verifying ? 'Confirmando…' : 'Confirmar'}
      </button>

      <p className={styles.switch}>
        <button type="button" className={styles.link} onClick={onCancel}>Sair</button>
      </p>
    </AuthLayout>
  );
}

export function MfaVerify({ onCancel }: { onCancel: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactorId(data?.totp.find(factor => factor.status === 'verified')?.id ?? null);
    });
  }, []);

  const verify = async (value: string) => {
    if (!factorId || value.length !== 6) return;
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: value });
    if (verifyError) {
      setError(INVALID_CODE);
      setCode('');
    }
    setVerifying(false);
  };

  return (
    <AuthLayout title="Verificação em duas etapas" subtitle="Digite o código de 6 dígitos do seu app autenticador.">
      <CodeInput value={code} onChange={setCode} onComplete={verify} disabled={!factorId || verifying} />
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.primary} disabled={!factorId || verifying || code.length !== 6} onClick={() => verify(code)}>
        {verifying ? 'Confirmando…' : 'Confirmar'}
      </button>
      <p className={styles.switch}>
        <button type="button" className={styles.link} onClick={onCancel}>Entrar com outra conta</button>
      </p>
    </AuthLayout>
  );
}
