const CACHE_NAME = "emmanuel-assembly-v1.0.0";
const STATIC_CACHE_URLS = [
  "/",
  "/dashboard",
  "/members",
  "/visitors",
  "/groups",
  "/attendance",
  "/manifest.json",
  "/offline.html"
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the service worker takes control immediately
  return self.clients.claim();
});

// Fetch event - handle requests with proper redirect handling
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // For navigation requests, handle redirects properly
      if (event.request.mode === "navigate") {
        return fetch(event.request, {
          redirect: "follow" // Explicitly follow redirects
        }).then((response) => {
          // If the fetch fails, return offline page
          if (!response || response.status !== 200 || response.type !== "basic") {
            return caches.match("/offline.html");
          }
          
          // Cache the successful response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          
          return response;
        }).catch(() => {
          return caches.match("/offline.html");
        });
      }

      // For other requests, fetch with redirect handling
      return fetch(event.request, {
        redirect: "follow"
      }).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Cache successful responses
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      }).catch(() => {
        // For API calls, return a proper error response
        if (event.request.url.includes("/api/")) {
          return new Response(
            JSON.stringify({ error: "Offline" }),
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        return new Response("Offline", { status: 503 });
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // This would sync offline actions when back online
  console.log("Background sync triggered");
}