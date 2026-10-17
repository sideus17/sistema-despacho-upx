import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EmergencyCall } from '../types';
import { PRIORITY_META, QUEUE_WAIT, Queue, queueOf, waitingSince } from '../utils/calls';
import { playAlert, unlockAlertSound } from '../utils/alertSound';

type Toast = (message: string, kind?: 'success' | 'error' | 'info') => void;

const CHECK_WAIT_MS = 5000;

// Alertas ligados ou desligados (som e notificação do navegador); salvo no aparelho, começa ligado
const KEY = 'samu:alertas-chamados';
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

let enabled = readEnabled();

export function setCallAlertsEnabled(value: boolean) {
  enabled = value;
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // Sem armazenamento: vale até fechar a página
  }
  if (value) {
    // O clique no botão libera o som e é a hora de pedir a permissão de notificação
    unlockAlertSound();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  }
  listeners.forEach(listener => listener());
}

export function useCallAlertsEnabled(): boolean {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => enabled
  );
}

function notify(title: string, body: string, tag: string) {
  // A notificação do sistema só faz sentido com a central em outra aba ou janela
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag });
  } catch {
    // Alguns navegadores só aceitam notificação pelo service worker: fica o aviso na tela
  }
}

const describe = (call: EmergencyCall) => `${PRIORITY_META[call.priority]?.name ?? call.priority} · ${call.address}`;

// Chave de um chamado numa fila: o mesmo chamado avisa ao chegar na regulação e de novo no despacho
export const queueKey = (call: Pick<EmergencyCall, 'id' | 'status'>) => `${call.status}:${call.id}`;

const ARRIVAL: Record<Queue, { one: string; many: (count: number) => string; title: string }> = {
  regulacao: { one: 'Novo chamado', many: count => `${count} chamados novos para regular`, title: 'Novo chamado' },
  despacho: { one: 'Chamado regulado, aguardando despacho', many: count => `${count} chamados regulados aguardando despacho`, title: 'Chamado regulado' }
};

const LATE: Record<Queue, { minutes: number; label: string }> = {
  regulacao: { minutes: QUEUE_WAIT.regulacao.critical / 60_000, label: 'aguardando regulação' },
  despacho: { minutes: QUEUE_WAIT.despacho.critical / 60_000, label: 'aguardando despacho' }
};

/**
 * Avisa a central: chamado novo para regular, chamado regulado esperando viatura (os que esta tela
 * abriu ou regulou não contam) e espera longa em cada fila (3 min na regulação, 5 min no despacho;
 * uma vez por chamado e fila). O aviso na tela sai sempre; som e notificação, só com os alertas ligados.
 */
export function useCallAlerts(calls: EmergencyCall[], ownKeys: { current: Set<string> }, toast: Toast) {
  const on = useCallAlertsEnabled();
  const seen = useRef<Set<string> | null>(null);
  const warned = useRef(new Set<string>());
  const waiting = calls.filter(call => queueOf(call) !== null);
  const [tick, setTick] = useState(0);

  // O primeiro toque ou tecla na página libera o som (exigência dos navegadores)
  useEffect(() => {
    const unlock = () => unlockAlertSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Chamado que acabou de chegar numa fila
  useEffect(() => {
    const keys = calls.map(queueKey);
    if (seen.current === null) {
      // Primeira leitura: o que já estava nas filas não é novidade
      seen.current = new Set(keys);
      return;
    }
    const fresh = waiting.filter(call => !seen.current!.has(queueKey(call)) && !ownKeys.current.has(queueKey(call)));
    keys.forEach(key => seen.current!.add(key));

    for (const queue of ['regulacao', 'despacho'] as Queue[]) {
      const arrived = fresh.filter(call => queueOf(call) === queue);
      if (arrived.length === 0) continue;
      const text = ARRIVAL[queue];
      toast(arrived.length === 1 ? `${text.one}: ${describe(arrived[0])}` : text.many(arrived.length), 'info');
      if (on) {
        playAlert('novo');
        arrived.forEach(call => notify(text.title, describe(call), queueKey(call)));
      }
    }
  }, [calls]);

  // Espera longa: confere a cada 5 s
  useEffect(() => {
    if (waiting.length === 0) return;
    const timer = window.setInterval(() => setTick(value => value + 1), CHECK_WAIT_MS);
    return () => window.clearInterval(timer);
  }, [waiting.length]);

  useEffect(() => {
    const now = Date.now();
    for (const queue of ['regulacao', 'despacho'] as Queue[]) {
      const late = waiting.filter(
        call => queueOf(call) === queue && now - Date.parse(waitingSince(call)) >= QUEUE_WAIT[queue].critical && !warned.current.has(queueKey(call))
      );
      if (late.length === 0) continue;
      late.forEach(call => warned.current.add(queueKey(call)));

      const { minutes, label } = LATE[queue];
      toast(
        late.length === 1
          ? `Chamado ${label} há ${minutes} min ou mais: ${describe(late[0])}`
          : `${late.length} chamados ${label} há ${minutes} min ou mais`,
        'error'
      );
      if (on) {
        playAlert('espera');
        late.forEach(call => notify('Chamado aguardando', describe(call), `${queueKey(call)}-espera`));
      }
    }
  }, [tick, calls]);
}
