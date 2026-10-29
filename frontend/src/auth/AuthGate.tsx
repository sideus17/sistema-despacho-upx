import { useCallback, useEffect, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { clearStoredSession, supabase } from '../lib/supabase';
import { getErrorMessage, getMe, isServerUnreachable, ProfilePatch, updateMe as saveProfile } from '../services/api';
import { Me, UserRole } from '../types';
import { useToast } from '../components/Toast';
import { onThemeChoice, setThemePreference } from '../theme/theme';
import App from '../App';
import CrewApp from '../crew/CrewApp';
import { AuthContext } from './AuthContext';
import { AuthLayout } from './AuthUI';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import { MfaEnroll, MfaVerify } from './Mfa';
import { Spinner } from '../ui/Spinner';
import styles from './auth.module.css';

type Stage = 'loading' | 'login' | 'signup' | 'mfa-enroll' | 'mfa-verify' | 'unavailable' | 'ready';

// Último perfil confirmado pelo servidor: deixa o motorista abrir o app sem sinal
const PROFILE_KEY = 'samu:perfil';
// Com sinal fraco, quanto esperar o servidor antes de abrir com o perfil salvo
const WEAK_SIGNAL_WAIT_MS = 4000;
const UNAVAILABLE_RETRY_MS = 15000;

function readCachedProfile(): Me | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile: Me | null) {
  try {
    // O CPF não fica no aparelho: a página "Minha conta" busca do servidor
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, cpf: undefined }));
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Sem armazenamento: o app só não abre offline
  }
}

/**
 * Decide a tela pela sessão: login/cadastro → MFA (cadastrar ou confirmar) → app da função.
 * Motorista vai para a tela da viatura; atendente, para a central.
 */
export default function AuthGate() {
  const [stage, setStage] = useState<Stage>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const toast = useToast();

  const applyProfile = useCallback((profile: Me) => {
    setMe(current => (JSON.stringify(current) === JSON.stringify(profile) ? current : profile));
    setStage('ready');
  }, []);

  const check = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session) {
      // Token vencido e sem sinal: o supabase-js mantém a sessão salva e renova quando a conexão voltar
      const cached = sessionError && isAuthRetryableFetchError(sessionError) ? readCachedProfile() : null;
      if (cached) {
        applyProfile(cached);
        return;
      }
      setMe(null);
      setStage(current => (current === 'signup' ? 'signup' : 'login'));
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== 'aal2') {
      setStage(aal?.nextLevel === 'aal2' ? 'mfa-verify' : 'mfa-enroll');
      return;
    }

    try {
      const profile = await getMe();
      cacheProfile(profile);
      // O tema salvo na conta vale em qualquer aparelho
      if (profile.theme) setThemePreference(profile.theme, { fromAccount: true });
      applyProfile(profile);
    } catch (error) {
      // Falta de sinal não desloga: na estrada a conexão vai e volta
      if (isServerUnreachable(error)) {
        const cached = readCachedProfile();
        if (cached?.id === session.user.id) applyProfile(cached);
        else setStage('unavailable');
        return;
      }
      // O servidor recusou a conta (sessão inválida, perfil removido)
      toast(getErrorMessage(error, 'Não foi possível carregar seu perfil.'), 'error');
      await supabase.auth.signOut();
    }
  }, [toast, applyProfile]);

  const evaluate = useCallback(async () => {
    // Sem sinal o supabase-js insiste por até 30 s para renovar o token: com perfil salvo, o app abre antes
    // e a verificação continua por trás (se o servidor recusar a conta, volta para o login)
    const cached = readCachedProfile();
    const early = cached
      ? window.setTimeout(() => applyProfile(cached), navigator.onLine ? WEAK_SIGNAL_WAIT_MS : 0)
      : undefined;
    try {
      await check();
    } finally {
      window.clearTimeout(early);
    }
  }, [check, applyProfile]);

  useEffect(() => {
    evaluate();
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') cacheProfile(null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'MFA_CHALLENGE_VERIFIED') {
        // Fora do callback: o supabase-js recomenda não chamar a API dentro dele
        window.setTimeout(evaluate, 0);
      }
    });
    // Voltou o sinal: confirma a conta no servidor (e sai da tela "sem conexão")
    window.addEventListener('online', evaluate);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener('online', evaluate);
    };
  }, [evaluate]);

  const signOut = useCallback(async () => {
    cacheProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error && isAuthRetryableFetchError(error)) {
      clearStoredSession();
      setMe(null);
      setStage('login');
    }
  }, []);

  const updateMe = useCallback(async (patch: ProfilePatch) => {
    const profile = await saveProfile(patch);
    cacheProfile(profile);
    setMe(profile);
    return profile;
  }, []);

  // Tema trocado no menu ou na navegação vai para a conta, sem travar a tela (sem sinal, fica só no aparelho)
  const signedIn = stage === 'ready' && !!me;
  useEffect(() => {
    if (!signedIn) return;
    return onThemeChoice(theme => {
      updateMe({ theme }).catch(() => {});
    });
  }, [signedIn, updateMe]);

  // Na tela "Sem conexão" tenta sozinho: com sinal fraco o navegador nem sempre avisa que voltou
  useEffect(() => {
    if (stage !== 'unavailable') return;
    const timer = window.setInterval(evaluate, UNAVAILABLE_RETRY_MS);
    return () => window.clearInterval(timer);
  }, [stage, evaluate]);

  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await evaluate();
    } finally {
      setRetrying(false);
    }
  };

  if (stage === 'loading') {
    return (
      <AuthLayout>
        <Spinner className={styles.spinner} />
      </AuthLayout>
    );
  }
  if (stage === 'login') return <LoginScreen onSignup={() => setStage('signup')} />;
  if (stage === 'signup') return <SignupScreen onLogin={() => setStage('login')} />;
  if (stage === 'mfa-enroll') return <MfaEnroll onCancel={signOut} />;
  if (stage === 'mfa-verify') return <MfaVerify onCancel={signOut} />;
  if (stage === 'unavailable') {
    return (
      <AuthLayout title="Sem conexão" subtitle="Não foi possível falar com o servidor. Confira o sinal e tente de novo.">
        <button className={styles.primary} disabled={retrying} onClick={retry}>
          {retrying ? 'Tentando…' : 'Tentar novamente'}
        </button>
        <p className={styles.switch}>
          <button className={styles.link} onClick={signOut}>Sair da conta</button>
        </p>
      </AuthLayout>
    );
  }
  if (!me) return null;

  return (
    <AuthContext.Provider value={{ me, signOut, updateMe }}>
      {me.role === UserRole.MOTORISTA ? <CrewApp /> : <App />}
    </AuthContext.Provider>
  );
}
