import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../../services/api';

/**
 * Carrega de novo quando `key` muda (filtros); o pedido anterior é cancelado. Enquanto recarrega, os
 * dados anteriores continuam na tela (sem piscar); um erro não apaga o que já estava lá.
 */
export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadRef.current(controller.signal).then(
      result => {
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
        setLoading(false);
      },
      reason => {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(reason, 'Não foi possível carregar os dados.'));
        setLoading(false);
      }
    );
    return () => controller.abort();
  }, [key, attempt]);

  return { data, error, loading, retry: () => setAttempt(value => value + 1) };
}
