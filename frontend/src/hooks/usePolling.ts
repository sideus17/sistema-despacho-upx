import { useEffect, useRef } from 'react';

/**
 * Executa `load` periodicamente. Pausa com a aba oculta (salvo `whileHidden`), recarrega ao voltar
 * e tenta de novo mais cedo quando a última carga falhou. A central usa `whileHidden` para avisar
 * chamado novo com a aba em segundo plano (o navegador espaça os timers, mas continua).
 */
export function usePolling(
  load: () => Promise<boolean>,
  intervalMs: number,
  retryMs: number,
  { whileHidden = false }: { whileHidden?: boolean } = {}
) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const tick = async () => {
      const ok = document.hidden && !whileHidden ? true : await loadRef.current();
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
  }, [intervalMs, retryMs, whileHidden]);
}
