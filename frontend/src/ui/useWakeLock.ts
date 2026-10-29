import { useEffect } from 'react';

// Tela sempre acesa enquanto `active` (o turno do motorista): com a tela apagada o navegador para de
// consultar o servidor e o despacho só chega pelo aviso do sistema. O navegador solta o travamento quando
// a página fica escondida; volta a pedir quando ela aparece de novo.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    const request = async () => {
      try {
        const next = (await navigator.wakeLock?.request('screen')) ?? null;
        if (released) next?.release().catch(() => {});
        else lock = next;
      } catch {
        // Sem suporte ou bateria fraca: segue sem travar a tela
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
