import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getErrorMessage } from '../../services/api';

// Pedidos da gestão em andamento (de qualquer aba): o "Atualizar" gira enquanto houver algum
let pending = 0;
const busyListeners = new Set<() => void>();

function changePending(delta: number) {
  pending += delta;
  busyListeners.forEach(listener => listener());
}

export function useManagementBusy(): boolean {
  return useSyncExternalStore(
    listener => {
      busyListeners.add(listener);
      return () => busyListeners.delete(listener);
    },
    () => pending > 0
  );
}

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
    let counted = true;
    changePending(1);
    const settle = () => {
      if (!counted) return;
      counted = false;
      changePending(-1);
    };
    loadRef.current(controller.signal).then(
      result => {
        if (controller.signal.aborted) return;
        settle();
        setData(result);
        setError(null);
        setLoading(false);
      },
      reason => {
        if (controller.signal.aborted) return;
        settle();
        setError(getErrorMessage(reason, 'Não foi possível carregar os dados.'));
        setLoading(false);
      }
    );
    return () => {
      settle();
      controller.abort();
    };
  }, [key, attempt]);

  return { data, error, loading, retry: () => setAttempt(value => value + 1) };
}
