import webpush from 'web-push';
import { supabase } from '../config/supabase';
import { PushMessage, SubscriptionInput, pushConfig, subscriptionGone } from './push';

const config = pushConfig(process.env);
if (config) webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
else console.warn('Web Push desligado: faltam VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ou VAPID_SUBJECT.');

export const pushPublicKey = (): string | null => config?.publicKey ?? null;

// O mesmo aparelho inscrito de novo (ou por outra conta) troca de dono e de chaves
export async function saveSubscription(userId: string, subscription: SubscriptionInput): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, ...subscription }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
}

export async function deleteSubscription(userId: string, endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
  if (error) throw new Error(error.message);
}

// Manda para todos os aparelhos da pessoa. Falha só vai para o log: o despacho já aconteceu e o app
// também avisa quando está aberto
export async function sendToUser(userId: string, message: PushMessage): Promise<void> {
  if (!config) return;
  try {
    const { data, error } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId);
    if (error) throw new Error(error.message);

    await Promise.all((data ?? []).map(async row => {
      try {
        // Urgente e válido por 10 min: um despacho de meia hora atrás não deve tocar
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(message),
          { TTL: 600, urgency: 'high', topic: message.tag.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, '') }
        );
        await supabase.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).eq('id', row.id);
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (subscriptionGone(statusCode)) await supabase.from('push_subscriptions').delete().eq('id', row.id);
        else console.warn('Falha ao enviar o aviso de despacho:', statusCode ?? error);
      }
    }));
  } catch (error) {
    console.warn('Falha ao buscar as inscrições de aviso:', error);
  }
}
