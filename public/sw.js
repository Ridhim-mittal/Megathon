// Lakshyam keeps working offline after the first visit (school labs and phones with patchy data).
// - The page: the newest copy when online, the saved copy when offline.
// - Built files (/assets/…, names change with every build): saved the first time, then served from
//   the phone, so a second visit downloads nothing.
// - Other files (icon, manifest): served saved, refreshed in the background.
// - Music streams in pieces (Range requests) and is left to the browser: offline, the game is
//   silent but plays.
// Registered by src/main.jsx in production builds only.

const CACHE = "lakshyam-v1";
const PAGE = new URL("./", self.registration.scope).href;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(PAGE)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const save = (request, response) => {
  if (response.ok && response.status === 200) caches.open(CACHE).then((cache) => cache.put(request, response));
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.has("range")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => (save(PAGE, response.clone()), response))
        .catch(() => caches.match(PAGE).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) => hit ?? fetch(request).then((response) => (save(request, response.clone()), response)),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const fresh = fetch(request)
        .then((response) => (save(request, response.clone()), response))
        .catch(() => hit ?? Response.error());
      return hit ?? fresh;
    }),
  );
});
