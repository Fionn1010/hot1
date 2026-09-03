/*
 * Fionn Heritage service worker
 * Version 2
 *
 * Version 1 static-model policy:
 * - HTML/CSS/JS/JSON: network first, cache fallback.
 * - GLB/GLTF models: network first, cache fallback.
 * - Video/audio/images: cache first for bandwidth efficiency.
 *
 * Changing VERSION from v1 to v2 also causes the old fionn-shell-v1
 * cache to be removed when this service worker activates.
 */

const VERSION = "fionn-shell-v2";

const SHELL = [
  "./",
  "./index.html",
  "./config/platform.json",
  "./engine/fionn-platform.js",
  "./engine/bootstrap.js",
  "./css/fionn-platform.css"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== VERSION)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate";
  const isCode = /\.(?:html?|css|js|json)$/i.test(url.pathname);
  const isModel = /\.(?:glb|gltf)$/i.test(url.pathname);
  const isOtherMedia =
    /\.(?:mp4|webm|mp3|m4a|wav|ogg|png|jpe?g|webp)$/i.test(url.pathname);

  /*
   * Pages and code: network first.
   * Visitors receive current tour code when online, with an offline fallback.
   */
  if (isNavigation || isCode) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(hit => hit || (isNavigation ? caches.match("./index.html") : undefined))
        )
    );
    return;
  }

  /*
   * Static GLB/GLTF models: NETWORK FIRST.
   *
   * This is important for the Hill of Tara tour because models may be replaced
   * on Cloudflare R2 while retaining the same filename (for example 5mound.glb).
   *
   * When online:
   *   1. Ask Cloudflare/the network for the current model.
   *   2. Save the successful response into the current cache.
   *
   * When offline or the network fails:
   *   3. Fall back to the last successfully cached model.
   */
  if (isModel) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /*
   * Video, audio and images: cache first.
   * These are generally larger assets and do not need the same aggressive
   * freshness behaviour as replace-in-place GLB models.
   */
  if (isOtherMedia) {
    event.respondWith(
      caches.match(request).then(hit => {
        if (hit) return hit;

        return fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
