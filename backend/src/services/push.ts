import { CallPriority } from '../types';

// Aviso do despacho por Web Push: o que dá para testar sem Supabase nem servidor de push

export interface PushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

// Sem as três chaves o push fica desligado e o resto do sistema funciona igual
export function pushConfig(env: NodeJS.ProcessEnv): PushConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export interface SubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// O que o navegador entrega em PushSubscription.toJSON()
export function parseSubscription(body: unknown): SubscriptionInput | null {
  const value = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = typeof value?.endpoint === 'string' ? value.endpoint.trim() : '';
  const p256dh = typeof value?.keys?.p256dh === 'string' ? value.keys.p256dh : '';
  const auth = typeof value?.keys?.auth === 'string' ? value.keys.auth : '';
  if (!endpoint.startsWith('https://') || endpoint.length > 1000 || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

const PRIORITY_NAME: Record<CallPriority, string> = {
  [CallPriority.EMERGENCIA]: 'Vermelho',
  [CallPriority.URGENTE]: 'Amarelo',
  [CallPriority.PRIORITARIO]: 'Verde',
  [CallPriority.NAO_URGENTE]: 'Azul'
};

export interface PushMessage {
  title: string;
  body: string;
  tag: string; // um aviso por chamado: o mesmo chamado substitui o anterior
  url: string;
}

// "Amarelo · Rua Barão do Rio Branco, 200 - Centro"
export function dispatchMessage(call: { id: string; priority: CallPriority; address: string }): PushMessage {
  const color = PRIORITY_NAME[call.priority] ?? 'Chamado';
  return { title: 'Novo despacho', body: `${color} · ${call.address}`, tag: `despacho-${call.id}`, url: '/' };
}

// O serviço de push responde 404 ou 410 quando a inscrição não vale mais (app desinstalado, permissão tirada)
export function subscriptionGone(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}
