import { useEffect, useState } from 'react';
import { CloseIcon } from '../ui/icons';
import styles from './CrewApp.module.css';

const DISMISS_KEY = 'samu:instalacao-dispensada';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

// Android/Chrome: botão que abre o prompt nativo. iOS: instrução manual (não há prompt).
export default function InstallBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(isDismissed);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isStandalone || dismissed || (!installEvent && !isIOS)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Sem armazenamento: dispensa só nesta sessão
    }
    setDismissed(true);
  };

  return (
    <div className={styles.install}>
      {installEvent ? (
        <>
          <span>Instale o app para abrir direto da tela inicial.</span>
          <button className={styles.installButton} onClick={() => installEvent.prompt().then(() => setInstallEvent(null))}>
            Instalar
          </button>
        </>
      ) : (
        <span>Para instalar: toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</span>
      )}
      <button className={styles.installDismiss} onClick={dismiss} aria-label="Dispensar"><CloseIcon /></button>
    </div>
  );
}
