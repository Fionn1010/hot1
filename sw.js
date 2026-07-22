/* Fionn Heritage adaptive service worker — Tara v2.1 scroll fix */
const CACHE='fionn-tara-v2-adaptive-2026-07-22-scrollfix-1';
const SHELL=[
  './',
  './index.html',
  './css/styles.css',
  './css/fionn-engine.css',
  './js/config.js',
  './js/language.js',
  './js/developer.js',
  './js/core.js',
  './js/ar.js',
  './js/video.js',
  './js/gps.js',
  './js/preload.js',
  './js/app.js',
  './engine/fionn-engine.js',
  './engine/capabilities.js',
  './engine/quality-manager.js',
  './engine/asset-loader.js',
  './engine/ui-controls.js',
  './config/asset-tiers.json'
];

self.addEventListener('install',event=>
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(SHELL))
      .then(()=>self.skipWaiting())
  )
);

self.addEventListener('activate',event=>
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  )
);

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const url=new URL(event.request.url);
  const isLarge=/\.(glb|gltf|mp4|mp3|m4a|wav)$/i.test(url.pathname);

  if(isLarge){
    event.respondWith(
      caches.open(CACHE).then(async cache=>{
        const cached=await cache.match(event.request);
        if(cached) return cached;

        const response=await fetch(event.request);
        if(response.ok) cache.put(event.request,response.clone());
        return response;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok) caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
