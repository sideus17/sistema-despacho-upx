import { useCallback, useEffect, useState } from 'react';
import { getPushKey, subscribePush, unsubscribePush } from '../services/api';

// Aviso do despacho com o app fechado ou a tela apagada (Web Push). O service worker só existe na
// versão publicada (no `npm run dev` fica "unsupported"); no iPhone, só com o app na tela inicial.
export type DispatchPushState = 'unsupported' | 'off' | 'ask' | 'blocked' | 'on';

async function currentRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return undefined;
  return navigator.serviceWorker.getRegistration();
}

// A chave pública chega em base64url; o navegador quer os bytes
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function useDispatchPush(onShift: boolean) {
  const [state, setState] = useState<DispatchPushState>('unsupported');

  // Inscreve o aparelho (ou confirma a inscrição que já existe) no servidor
  const subscribe = useCallback(async (registration: ServiceWorkerRegistration) => {
    const key = await getPushKey();
    if (!key) {
      setState('off');
      return;
    }
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    await subscribePush(subscription.toJSON());
    setState('on');
  }, []);

  useEffect(() => {
    if (!onShift) return;
    let cancelled = false;
    currentRegistration().then(registration => {
      if (cancelled) return;
      if (!registration) return setState('unsupported');
      if (Notification.permission === 'denied') return setState('blocked');
      if (Notification.permission === 'default') return setState('ask');
      subscribe(registration).catch(() => { if (!cancelled) setState('ask'); });
    });
    return () => { cancelled = true; };
  }, [onShift, subscribe]);

  // Precisa de um toque do motorista: o iPhone só pede a permissão a partir de um gesto
  const enable = useCallback(async () => {
    const registration = await currentRegistration();
    if (!registration) return setState('unsupported');
    const permission = await Notification.requestPermission();
    if (permission === 'granted') await subscribe(registration);
    else setState(permission === 'denied' ? 'blocked' : 'ask');
  }, [subscribe]);

  // Ao sair da conta o aparelho deixa de receber avisos desta pessoa
  const disable = useCallback(async () => {
    try {
      const subscription = await (await currentRegistration())?.pushManager.getSubscription();
      if (!subscription) return;
      await unsubscribePush(subscription.endpoint).catch(() => {});
      await subscription.unsubscribe();
    } catch {
      // Sem service worker ou sem rede: o servidor apaga a inscrição quando o envio falhar
    }
  }, []);

  return { state, enable, disable };
}
