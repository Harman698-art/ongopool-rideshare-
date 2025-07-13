// OnGoPool Service Worker
// Provides offline functionality and push notifications

const CACHE_NAME = 'ongopool-v1.0.0';
const STATIC_CACHE = 'ongopool-static-v1';
const DYNAMIC_CACHE = 'ongopool-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/rides.js',
  '/js/maps.js',
  '/js/payments.js',
  '/js/supabase.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch(error => {
        console.error('Service Worker: Cache installation failed', error);
      })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
            .map(cacheName => {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Skip Supabase API calls (always go to network for fresh data)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If network fails, return offline message
          return new Response(
            JSON.stringify({ error: 'Offline - unable to connect to server' }),
            { 
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          );
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  if (STATIC_FILES.some(file => request.url.includes(file))) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(fetchResponse => {
              // Clone response before caching
              const responseClone = fetchResponse.clone();
              caches.open(STATIC_CACHE)
                .then(cache => cache.put(request, responseClone));
              return fetchResponse;
            });
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
    );
    return;
  }

  // Network-first strategy for dynamic content
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache
        return caches.match(request)
          .then(response => {
            if (response) {
              return response;
            }
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'sync-ride-requests') {
    event.waitUntil(syncRideRequests());
  }
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Push notification handling
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'You have a new notification from OnGoPool',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.title = payload.title || 'OnGoPool';
    options.data = { ...options.data, ...payload.data };
  }

  event.waitUntil(
    self.registration.showNotification('OnGoPool', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app and navigate to relevant page
    event.waitUntil(
      clients.openWindow('/#dashboard')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          if (clientList.length > 0) {
            return clientList[0].focus();
          }
          return clients.openWindow('/');
        })
    );
  }
});

// Helper functions for background sync
async function syncRideRequests() {
  try {
    // Get pending ride requests from IndexedDB
    const pendingRequests = await getStoredRequests();
    
    for (const request of pendingRequests) {
      try {
        // Attempt to sync with server
        const response = await fetch('/api/ride-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });
        
        if (response.ok) {
          // Remove from local storage on success
          await removeStoredRequest(request.id);
        }
      } catch (error) {
        console.error('Failed to sync ride request:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncMessages() {
  try {
    // Get pending messages from IndexedDB
    const pendingMessages = await getStoredMessages();
    
    for (const message of pendingMessages) {
      try {
        // Attempt to sync with server
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          // Remove from local storage on success
          await removeStoredMessage(message.id);
        }
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('Message sync failed:', error);
  }
}

// IndexedDB helpers (simplified)
async function getStoredRequests() {
  // Implement IndexedDB retrieval
  return JSON.parse(localStorage.getItem('pendingRideRequests') || '[]');
}

async function removeStoredRequest(id) {
  // Implement IndexedDB removal
  const requests = JSON.parse(localStorage.getItem('pendingRideRequests') || '[]');
  const filtered = requests.filter(req => req.id !== id);
  localStorage.setItem('pendingRideRequests', JSON.stringify(filtered));
}

async function getStoredMessages() {
  // Implement IndexedDB retrieval
  return JSON.parse(localStorage.getItem('pendingMessages') || '[]');
}

async function removeStoredMessage(id) {
  // Implement IndexedDB removal
  const messages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
  const filtered = messages.filter(msg => msg.id !== id);
  localStorage.setItem('pendingMessages', JSON.stringify(filtered));
}