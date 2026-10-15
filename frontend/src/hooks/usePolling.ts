import { useEffect, useRef } from 'react';

/**
 * Executa `load` periodicamente. Pausa com a aba oculta, recarrega ao voltar
 * e tenta de novo mais cedo quando a última carga falhou.
 */
export function usePolling(load: () => Promise<boolean>, intervalMs: number, retryMs: number) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const tick = async () => {
      const ok = document.hidden ? true : await loadRef.current();
      if (!cancelled) timer = window.setTimeout(tick, ok ? intervalMs : retryMs);
    };

    const handleVisibility = () => {
      if (!document.hidden) loadRef.current();
    };

    tick();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, retryMs]);
}
