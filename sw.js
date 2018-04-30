var staticCacheName = 'restaurant-static-v12';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
        '/index.html',
      ]);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restaurant-') &&
                 !staticCacheName.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(staticCacheName).then(function(cache) {
      return cache.match(event.request.url).then(function(response) {
        if (response) return response;

        return fetch(event.request).then(function(networkResponse) {
          cache.put(event.request.url, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
