const CACHE_NAME = "emmanuel-assembly-v1.0.1";
const STATIC_CACHE_URLS = [
  // Only cache truly static, non-HTML resources here
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

self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // For navigations, let the network/browser handle redirects to avoid
  // "redirect mode is not 'follow'" errors. Provide offline fallback only.
  if (event.request.mode === "navigate") {
    if (!self.navigator.onLine) {
      event.respondWith(caches.match("/offline.html"));
    }
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // For other requests, fetch with redirect handling
      return fetch(event.request, {
        redirect: "follow"
      }).then((response) => {
        // Handle redirect responses
        if (response.type === "opaqueredirect" || response.status === 302 || response.status === 301) {
          // Never cache redirects; just pass through
          return response;
        }
        
        // Don't cache non-successful responses or HTML documents
        const contentType = response.headers.get("content-type") || "";
        if (!response || response.status !== 200 || response.type !== "basic" || contentType.includes("text/html")) {
          return response;
        }

        // Cache successful responses
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      }).catch((error) => {
        console.log("Fetch error:", error);
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