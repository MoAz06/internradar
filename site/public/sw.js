// internradar's service worker. Pages always come from the network first, so nobody sees old deadlines;
// the cache only answers when there's no connection. Files under /_next/static/ never change (their names
// have a hash), so those come from the cache first. Other sites (the visit counter, job boards) are left alone.

const CACHE = "internradar-v3";
const START = ["/", "/today/", "/mine/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(START))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const offline = () =>
  new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline - internradar</title>' +
      '<body style="font-family:Georgia,serif;background:#f5f0e6;color:#1f2421;padding:24px;max-width:560px">' +
      "<h1>No connection</h1><p>This page isn't saved on this device yet. Pages you opened before, and your saved roles, work without a connection.</p>" +
      '<p><a href="/mine/" style="color:#0f5a46">Your saved roles</a></p></body>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
        if (hit) return hit;
        if (req.mode === "navigate") return offline();
        return Response.error();
      }),
  );
});
