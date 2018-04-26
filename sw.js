const cacheName = 'pwa-1';

self.addEventListener('install', function(event) {
    event.waitUntil(preLoad());
});

function preLoad() {
    console.log('SW: installing');
    return caches.open(cacheName).then(function(cache) {
        console.log('SW: Cached index page during installation');
        return cache.addAll(['/index.html']);
    });
}
  
self.addEventListener('fetch', function(event) {
    event.respondWith(checkResponse(event.request).catch(function() {
        return returnFromCache(event.request)
    }));
    event.waitUntil(addToCache(event.request));
});
  
function checkResponse(request) {
    return new Promise(function(fulfill, reject) {
        fetch(request).then(function(response) {
            if (response.status !== 404) {
                fulfill(response);
            } else {
                reject();
            }
        }, reject);
    });
};
  
function addToCache(request) {
    return caches.open(cacheName).then(function (cache) {
        return fetch(request).then(function (response) {
            console.log('SW: added cache' + response.url);
            return cache.put(request, response);
        });
    });
};
  
function returnFromCache(request) {
    return caches.open(cacheName).then(function (cache) {
        return cache.match(request).then(function (matching) {
            if (matching && matching.status !== 404) {
                return matching;
            }
        });
    });
};