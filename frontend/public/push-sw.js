// Aviso do despacho (Web Push). O service worker gerado pelo vite-plugin-pwa carrega este arquivo
// (workbox.importScripts no vite.config.ts): com o app fechado ou a tela apagada, é ele que toca.

self.addEventListener('push', event => {
  let message = { title: 'Novo despacho', body: 'Abra o app para ver o chamado.', tag: 'despacho', url: '/' };
  try {
    if (event.data) message = { ...message, ...event.data.json() };
  } catch {
    // Mensagem sem JSON: fica o texto padrão
  }

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      renotify: true, // o mesmo chamado de novo volta a tocar
      requireInteraction: true, // fica na tela até alguém tocar
      vibrate: [400, 200, 400, 200, 400],
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      lang: 'pt-BR',
      data: { url: message.url }
    })
  );
});

// Tocar no aviso abre o app (ou traz para a frente o que já está aberto)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const open = clients.find(client => client.url.startsWith(self.location.origin));
      return open ? open.focus() : self.clients.openWindow(url);
    })
  );
});
