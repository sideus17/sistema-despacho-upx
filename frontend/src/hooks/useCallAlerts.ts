import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Ambulance, AmbulanceStatus, EmergencyCall } from '../types';
import { PRIORITY_META, Queue, isLate, queueOf } from '../utils/calls';
import { playAlert, unlockAlertSound } from '../utils/alertSound';
import { announce } from '../ui/announce';

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
  const options: NotificationOptions = { body, tag, lang: 'pt-BR', icon: '/pwa-192x192.png' };
  const direct = () => {
    try {
      new Notification(title, options);
    } catch {
      // Sem service worker e sem notificação direta: fica o aviso na tela
    }
  };
  // Pelo service worker quando ele existe (alguns navegadores só aceitam assim)
  if (!('serviceWorker' in navigator)) return direct();
  navigator.serviceWorker
    .getRegistration()
    .then(registration => (registration ? registration.showNotification(title, options) : direct()))
    .catch(direct);
}

const describe = (call: EmergencyCall) => `${PRIORITY_META[call.priority]?.name ?? call.priority} · ${call.address}`;

// Chave de um chamado numa fila: o mesmo chamado avisa ao chegar na regulação e de novo no despacho
export const queueKey = (call: Pick<EmergencyCall, 'id' | 'status'>) => `${call.status}:${call.id}`;

const ARRIVAL: Record<Queue, { one: string; many: (count: number) => string; title: string }> = {
  regulacao: { one: 'Novo chamado', many: count => `${count} chamados novos para regular`, title: 'Novo chamado' },
  despacho: { one: 'Chamado regulado, aguardando despacho', many: count => `${count} chamados regulados aguardando despacho`, title: 'Chamado regulado' }
};

const waitingDispatch = (count: number) => `${count} ${count === 1 ? 'chamado esperando' : 'chamados esperando'} despacho`;

// O que esta aba já viu e já tocou fica guardado na sessão: recarregar a página não repete os avisos
const SEEN_KEY = 'samu:alertas-vistos';
const WARNED_KEY = 'samu:alertas-espera';
const MAX_KEYS = 500;

function readKeys(name: string): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(name);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeKeys(name: string, keys: Set<string>) {
  try {
    sessionStorage.setItem(name, JSON.stringify([...keys].slice(-MAX_KEYS)));
  } catch {
    // Sem armazenamento: vale até fechar a página
  }
}

/**
 * Avisa a central: chamado novo para regular, chamado regulado esperando viatura (os que esta tela
 * abriu ou regulou não contam), espera longa em cada fila (3 min na regulação, 5 min no despacho; uma
 * vez por chamado e fila) e viatura que ficou livre com chamado esperando despacho (as que esta tela
 * liberou ao finalizar não contam). A espera longa aparece na própria fila (CallList), não num aviso:
 * aqui ela só toca e notifica. Som e notificação, só com os alertas ligados.
 * `calls` é null até a primeira carga: comparar com a lista vazia do primeiro desenho anunciaria tudo como novo.
 */
export function useCallAlerts(
  calls: EmergencyCall[] | null,
  ownKeys: { current: Set<string> },
  toast: Toast,
  ambulances: Ambulance[] = [],
  ownFreed: { current: Set<string> } = { current: new Set() }
) {
  const on = useCallAlertsEnabled();
  const seen = useRef<Set<string> | null>(null);
  const warned = useRef<Set<string> | null>(null);
  const free = useRef<Set<string> | null>(null);
  const waiting = (calls ?? []).filter(call => queueOf(call) !== null);
  const [tick, setTick] = useState(0);

  // O primeiro toque ou tecla na página libera o som (exigência dos navegadores) e, com os alertas
  // ligados, pede a permissão de notificação para avisar com a aba em segundo plano
  useEffect(() => {
    const unlock = () => {
      unlockAlertSound();
      if (enabled && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Chamado que acabou de chegar numa fila
  useEffect(() => {
    if (calls === null) return;
    const keys = calls.map(queueKey);
    if (seen.current === null) {
      // Primeira leitura: o que já estava nas filas não é novidade. Numa recarga vale o que esta aba já
      // tinha visto, e só avisa o que chegou nesse meio-tempo
      const stored = readKeys(SEEN_KEY);
      seen.current = stored ?? new Set(keys);
      if (!stored) {
        writeKeys(SEEN_KEY, seen.current);
        return;
      }
    }
    const fresh = waiting.filter(call => !seen.current!.has(queueKey(call)) && !ownKeys.current.has(queueKey(call)));
    keys.forEach(key => seen.current!.add(key));
    writeKeys(SEEN_KEY, seen.current);

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
    if (calls === null) return;
    // Numa recarga, a espera que já tocou nesta aba não toca de novo
    if (warned.current === null) warned.current = readKeys(WARNED_KEY) ?? new Set();
    const now = Date.now();
    for (const queue of ['regulacao', 'despacho'] as Queue[]) {
      const late = waiting.filter(
        call => queueOf(call) === queue && isLate(call, now) && !warned.current!.has(queueKey(call))
      );
      if (late.length === 0) continue;
      late.forEach(call => warned.current!.add(queueKey(call)));
      writeKeys(WARNED_KEY, warned.current);
      // O leitor de tela fica sabendo mesmo com os alertas desligados (a pílula da espera não fala sozinha)
      announce(`Passou da meta de espera, ${queue === 'regulacao' ? 'aguardando regulação' : 'aguardando despacho'}: ${late.map(describe).join('; ')}`);

      if (on) {
        playAlert('espera');
        late.forEach(call => notify('Chamado aguardando', describe(call), `${queueKey(call)}-espera`));
      }
    }
  }, [tick, calls]);

  // Viatura que ficou livre (fim de atendimento, voltou a ficar disponível ou entrou em turno) com chamado
  // esperando despacho: a central volta a ter quem mandar
  useEffect(() => {
    if (ambulances.length === 0) return;
    const ids = new Set(ambulances.filter(ambulance => ambulance.driver && ambulance.status === AmbulanceStatus.DISPONIVEL).map(ambulance => ambulance.id));
    if (free.current === null) {
      // Primeira leitura: as que já estavam livres não são novidade
      free.current = ids;
      return;
    }
    const released = ambulances.filter(ambulance => ids.has(ambulance.id) && !free.current!.has(ambulance.id));
    free.current = ids;
    const pending = (calls ?? []).filter(call => queueOf(call) === 'despacho').length;

    for (const ambulance of released) {
      // Liberada por esta tela ao finalizar: quem finalizou já sabe
      if (ownFreed.current.delete(ambulance.id) || pending === 0) continue;
      const text = `${ambulance.code} ficou livre: ${waitingDispatch(pending)}`;
      toast(text, 'info');
      if (on) {
        playAlert('novo');
        notify('Viatura livre', text, `livre-${ambulance.id}`);
      }
    }
  }, [ambulances]);
}
