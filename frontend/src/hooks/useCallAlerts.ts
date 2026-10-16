import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CallStatus, EmergencyCall } from '../types';
import { PRIORITY_META, WAIT_CRITICAL_MS } from '../utils/calls';
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

/**
 * Avisa a central: chamado novo aberto por outro operador (os desta tela não contam) e chamado
 * pendente esperando 5 min ou mais (uma vez por chamado). O aviso na tela sai sempre; som e
 * notificação, só com os alertas ligados.
 */
export function useCallAlerts(calls: EmergencyCall[], ownIds: { current: Set<string> }, toast: Toast) {
  const on = useCallAlertsEnabled();
  const seen = useRef<Set<string> | null>(null);
  const warned = useRef(new Set<string>());
  const pending = calls.filter(call => call.status === CallStatus.PENDENTE);
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

  // Chamado novo
  useEffect(() => {
    const ids = calls.map(call => call.id);
    if (seen.current === null) {
      // Primeira leitura: o que já estava na fila não é novidade
      seen.current = new Set(ids);
      return;
    }
    const fresh = pending.filter(call => !seen.current!.has(call.id) && !ownIds.current.has(call.id));
    ids.forEach(id => seen.current!.add(id));
    if (fresh.length === 0) return;

    toast(fresh.length === 1 ? `Novo chamado: ${describe(fresh[0])}` : `${fresh.length} chamados novos na fila`, 'info');
    if (on) {
      playAlert('novo');
      fresh.forEach(call => notify('Novo chamado', describe(call), call.id));
    }
  }, [calls]);

  // Espera longa: confere a cada 5 s
  useEffect(() => {
    if (pending.length === 0) return;
    const timer = window.setInterval(() => setTick(value => value + 1), CHECK_WAIT_MS);
    return () => window.clearInterval(timer);
  }, [pending.length]);

  useEffect(() => {
    const now = Date.now();
    const late = pending.filter(call => now - Date.parse(call.timestamp) >= WAIT_CRITICAL_MS && !warned.current.has(call.id));
    if (late.length === 0) return;
    late.forEach(call => warned.current.add(call.id));

    toast(late.length === 1 ? `Chamado aguardando há 5 min ou mais: ${describe(late[0])}` : `${late.length} chamados aguardando há 5 min ou mais`, 'error');
    if (on) {
      playAlert('espera');
      late.forEach(call => notify('Chamado aguardando', describe(call), `${call.id}-espera`));
    }
  }, [tick, calls]);
}
