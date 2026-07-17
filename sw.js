/* Fionn Experience Preparation Service
   Experience 011 — Hill of Tara
*/

const CACHE_VERSION = 'fionn-e011-v4';

const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PRELOAD_CACHE = `${CACHE_VERSION}-experience`;


/* -------------------------------------------------------
   SERVICE WORKER INSTALL
------------------------------------------------------- */

self.addEventListener('install', event => {

  self.skipWaiting();

  event.waitUntil(

    caches
      .open(RUNTIME_CACHE)
      .then(cache => {

        return cache
          .addAll([
            './',
            'index.html'
          ])
          .catch(() => {});

      })

  );

});


/* -------------------------------------------------------
   SERVICE WORKER ACTIVATE
------------------------------------------------------- */

self.addEventListener('activate', event => {

  event.waitUntil((async () => {

    const keys = await caches.keys();

    await Promise.all(

      keys
        .filter(key =>
          key.startsWith('fionn-') &&
          !key.startsWith(CACHE_VERSION)
        )
        .map(key => caches.delete(key))

    );

    await self.clients.claim();

  })());

});


/* -------------------------------------------------------
   ORIGIN CHECK
------------------------------------------------------- */

function isSameOrigin(url) {

  try {

    return new URL(
      url,
      self.location.href
    ).origin === self.location.origin;

  } catch {

    return false;

  }

}


/* -------------------------------------------------------
   FIND CACHED RESOURCE
------------------------------------------------------- */

async function cachedFullResponse(request) {

  const preload = await caches.open(PRELOAD_CACHE);

  const preloadHit = await preload.match(
    request.url,
    {
      ignoreSearch: true
    }
  );

  if (preloadHit) {

    return preloadHit;

  }


  const runtime = await caches.open(RUNTIME_CACHE);

  return runtime.match(
    request.url,
    {
      ignoreSearch: true
    }
  );

}


/* -------------------------------------------------------
   VIDEO RANGE SUPPORT

   Mobile Safari and Chrome may request only part of an MP4.
------------------------------------------------------- */

async function serveRange(request, response) {

  const range = request.headers.get('range');

  if (!range || !response) {

    return response;

  }


  const buffer = await response.arrayBuffer();

  const size = buffer.byteLength;


  const match = /bytes=(\d+)-(\d*)/.exec(range);


  if (!match) {

    return new Response(
      null,
      {
        status: 416,
        headers: {
          'Content-Range': `bytes */${size}`
        }
      }
    );

  }


  const start = Number(match[1]);

  const end = match[2]
    ? Number(match[2])
    : size - 1;


  if (
    start >= size ||
    end >= size ||
    start > end
  ) {

    return new Response(
      null,
      {
        status: 416,
        headers: {
          'Content-Range': `bytes */${size}`
        }
      }
    );

  }


  const headers = new Headers(response.headers);

  headers.set(
    'Content-Range',
    `bytes ${start}-${end}/${size}`
  );

  headers.set(
    'Content-Length',
    String(end - start + 1)
  );

  headers.set(
    'Accept-Ranges',
    'bytes'
  );


  return new Response(

    buffer.slice(
      start,
      end + 1
    ),

    {
      status: 206,
      statusText: 'Partial Content',
      headers
    }

  );

}


/* -------------------------------------------------------
   FETCH HANDLER
------------------------------------------------------- */

self.addEventListener('fetch', event => {

  const request = event.request;


  if (
    request.method !== 'GET' ||
    !isSameOrigin(request.url)
  ) {

    return;

  }


  const path = new URL(
    request.url
  ).pathname;


  const isMedia = /\.(mp4|m4a|mp3|wav)$/i.test(path);


  const isLargeModel = /\.(glb|gltf)$/i.test(path);
 const isAsset = /\.(png|jpg|jpeg|webp|json)$/i.test(path);



  /* ---------------------------------------------------
     STORY SEQUENCES
  --------------------------------------------------- */

  if (isMedia) {

    event.respondWith((async () => {

      const cached = await cachedFullResponse(request);


      if (cached) {

        return serveRange(
          request,
          cached
        );

      }


      return fetch(request);

    })());


    return;

  }



  /* ---------------------------------------------------
     LARGE 3D MODELS
     Network-first unless explicitly placed in the rolling preload cache.
  --------------------------------------------------- */

  if (isLargeModel) {

    event.respondWith((async () => {

      const cached = await cachedFullResponse(request);

      if (cached) return cached;

      return fetch(request);

    })());

    return;

  }


  /* ---------------------------------------------------
     HISTORICAL ASSETS AND DATA
  --------------------------------------------------- */

  if (isAsset) {

    event.respondWith((async () => {

      const cached = await cachedFullResponse(request);


      if (cached) {

        return cached;

      }


      try {

        const response = await fetch(request);


        if (response.ok) {

          const cache = await caches.open(RUNTIME_CACHE);


          cache
            .put(
              request,
              response.clone()
            )
            .catch(() => {});

        }


        return response;


      } catch {


        return new Response(
          '',
          {
            status: 503
          }
        );

      }

    })());


    return;

  }



  /* ---------------------------------------------------
     FIONN INTERFACE
  --------------------------------------------------- */

  if (request.mode === 'navigate') {

    event.respondWith((async () => {

      try {

        const response = await fetch(request);


        const cache = await caches.open(RUNTIME_CACHE);


        cache
          .put(
            'index.html',
            response.clone()
          )
          .catch(() => {});


        return response;


      } catch {


        return (
          await caches.match('index.html')
        ) || Response.error();

      }

    })());

  }

});


/* -------------------------------------------------------
   SEND PRELOAD STATUS TO FIONN
------------------------------------------------------- */

async function notify(data) {

  const windows = await self.clients.matchAll({

    includeUncontrolled: true,

    type: 'window'

  });


  windows.forEach(client => {

    client.postMessage(data);

  });

}


/* -------------------------------------------------------
   CACHE A SINGLE RESOURCE
------------------------------------------------------- */

async function cacheURL(cache, url) {

  const absolute = new URL(
    url,
    self.registration.scope
  ).href;


  const existing = await cache.match(

    absolute,

    {
      ignoreSearch: true
    }

  );


  if (existing) {

    return;

  }


  const response = await fetch(

    absolute,

    {
      cache: 'reload'
    }

  );


  if (!response.ok) {

    throw new Error(
      `${response.status} ${url}`
    );

  }


  await cache.put(

    absolute,

    response.clone()

  );

}


/* -------------------------------------------------------
   PRELOAD A BATCH OF ASSETS
------------------------------------------------------- */

async function preload(
  urls,
  mode,
  done,
  total
) {

  const cache = await caches.open(PRELOAD_CACHE);


  for (const url of urls) {

    try {

      await cacheURL(
        cache,
        url
      );


    } catch (error) {


      console.warn(
        'Fionn preload skipped',
        url,
        error
      );

    }


    done++;


    await notify({

      type: 'FIONN_PRELOAD_PROGRESS',

      completed: done,

      total,

      mode

    });

  }


  return done;

}


/* -------------------------------------------------------
   FIONN EXPERIENCE PREPARATION
------------------------------------------------------- */

self.addEventListener('message', event => {

  const data = event.data || {};


  if (
    data.type !== 'FIONN_PRELOAD'
  ) {

    return;

  }


  event.waitUntil((async () => {


    const priority = Array.isArray(
      data.priority
    )
      ? data.priority
      : [];


    const remaining = Array.isArray(
      data.remaining
    )
      ? data.remaining
      : [];

    // Keep a rolling cache containing only the current and next stop.
    await caches.delete(PRELOAD_CACHE);



    const total =
      priority.length +
      remaining.length;


    let done = await preload(

      priority,

      data.mode,

      0,

      total

    );


    done = await preload(

      remaining,

      data.mode,

      done,

      total

    );


    await notify({

      type: 'FIONN_PRELOAD_COMPLETE',

      completed: done,

      total,

      mode: data.mode,

      language: data.language,

      experience: data.experience

    });


  })());

});
