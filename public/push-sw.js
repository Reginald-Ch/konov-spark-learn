// Push notification service worker
self.addEventListener('push', function(event) {
  let data = { title: 'Konov', body: 'You have a new notification!', url: 'https://konovartechtist.com/waitlist' };
  
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    // fallback to defaults
  }

  const options = {
    body: data.body,
    icon: data.icon || '/placeholder.svg',
    badge: data.badge || '/placeholder.svg',
    data: { url: data.url || 'https://konovartechtist.com/waitlist' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || 'https://konovartechtist.com/waitlist';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
