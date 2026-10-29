import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CallPriority } from '../types';
import { dispatchMessage, parseSubscription, pushConfig, subscriptionGone } from './push';

test('sem as três chaves VAPID o push fica desligado', () => {
  assert.equal(pushConfig({ VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' }), null);
  assert.equal(pushConfig({ VAPID_PUBLIC_KEY: ' ', VAPID_PRIVATE_KEY: 'priv', VAPID_SUBJECT: 'mailto:a@b.c' }), null);
  assert.deepEqual(
    pushConfig({ VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', VAPID_SUBJECT: 'mailto:a@b.c' }),
    { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:a@b.c' }
  );
});

test('inscrição do navegador: endpoint https e as duas chaves', () => {
  const valid = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'BPx', auth: 'au' } };
  assert.deepEqual(parseSubscription(valid), { endpoint: valid.endpoint, p256dh: 'BPx', auth: 'au' });
  assert.equal(parseSubscription({ ...valid, endpoint: 'http://exemplo.com' }), null);
  assert.equal(parseSubscription({ endpoint: valid.endpoint, keys: { p256dh: 'BPx' } }), null);
  assert.equal(parseSubscription(null), null);
});

test('o aviso diz a cor e o endereço, um por chamado', () => {
  assert.deepEqual(
    dispatchMessage({ id: 'call-1', priority: CallPriority.URGENTE, address: 'Rua da Penha, 120 - Centro' }),
    { title: 'Novo despacho', body: 'Amarelo · Rua da Penha, 120 - Centro', tag: 'despacho-call-1', url: '/' }
  );
});

test('404 e 410 do serviço de push apagam a inscrição; outros erros não', () => {
  assert.equal(subscriptionGone(410), true);
  assert.equal(subscriptionGone(404), true);
  assert.equal(subscriptionGone(429), false);
  assert.equal(subscriptionGone(undefined), false);
});
