// internradar's service worker. Pages always come from the network first, so nobody sees old deadlines;
// the cache only answers when there's no connection. Files under /_next/static/ never change (their names
// have a hash), so those come from the cache first. Other sites (the visit counter, job boards) are left alone.
//
// Reminders: when the visitor turns them on in the installed app, Chrome wakes this worker about twice a day
// (Periodic Background Sync). It reads the saved roles and followed companies the page left in the cache,
// fetches /reminders.json and shows a notification for deadlines 7 and 2 days out and on the day, and for new
// roles at followed companies. Nothing is sent anywhere; it all stays on the phone.

const CACHE = "internradar-v4";
const START = ["/", "/today/", "/mine/"];
const STATE = "internradar-state";
const STATE_URL = "/__reminders-state";
const TAG = "internradar-reminders";

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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== STATE).map((k) => caches.delete(k))))
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

// ---- reminders ----

async function readState() {
  const hit = await (await caches.open(STATE)).match(STATE_URL);
  return hit ? hit.json() : {};
}

async function writeState(s) {
  await (await caches.open(STATE)).put(STATE_URL, new Response(JSON.stringify(s), { headers: { "Content-Type": "application/json" } }));
}

/** The same short key as lib/items.ts, so a saved role id finds its row in reminders.json. */
function shortKey(id) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const daysTo = (from, to) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
const closes = (left) => (left === 0 ? "closes today" : left === 1 ? "closes tomorrow" : `closes in ${left} days`);
const STEPS = ["7", "2", "0"];

/** What to tell, from the state the page left and the roles on the site. No side effects, so it can be tested. */
function plan(state, roles, today) {
  const saved = new Set((state.saved || []).map(shortKey));
  const sent = { ...(state.sent || {}) };
  const due = [];
  for (const r of roles) {
    if (!saved.has(r.k) || !r.d) continue;
    const left = daysTo(today, r.d);
    if (left < 0) continue;
    const step = left === 0 ? "0" : left <= 2 ? "2" : left <= 7 ? "7" : null;
    if (!step || sent[`${r.k}:${step}`]) continue;
    // a later step covers the earlier ones, so "7 days" never comes after "2 days"
    for (const s of STEPS.slice(0, STEPS.indexOf(step) + 1)) sent[`${r.k}:${s}`] = today;
    due.push({ ...r, left });
  }
  // a company followed since the last check starts quiet: only roles added after that count as new
  const following = state.following || [];
  const known = { ...(state.known || {}) };
  const fresh = [];
  for (const slug of following) {
    const keys = roles.filter((r) => r.s === slug).map((r) => r.k);
    if (known[slug]) fresh.push(...roles.filter((r) => r.s === slug && !known[slug].includes(r.k)));
    known[slug] = keys;
  }
  for (const slug of Object.keys(known)) if (!following.includes(slug)) delete known[slug];
  const live = new Set(roles.map((r) => r.k));
  for (const k of Object.keys(sent)) if (!live.has(k.split(":")[0])) delete sent[k];

  const notes = [];
  if (due.length === 1) {
    const r = due[0];
    notes.push({ tag: "deadlines", title: `${r.c}: ${closes(r.left)}`, body: r.t, url: `/roles/${r.k}/` });
  } else if (due.length > 1) {
    due.sort((a, b) => a.left - b.left);
    const lines = due.slice(0, 4).map((r) => `${r.c}, ${closes(r.left)}`);
    if (due.length > 4) lines.push(`and ${due.length - 4} more`);
    notes.push({ tag: "deadlines", title: `${due.length} saved roles close soon`, body: lines.join("\n"), url: "/today/" });
  }
  if (fresh.length === 1) {
    const r = fresh[0];
    notes.push({ tag: "follow", title: `New at ${r.c}`, body: r.t, url: `/roles/${r.k}/` });
  } else if (fresh.length > 1) {
    const lines = fresh.slice(0, 4).map((r) => `${r.c}: ${r.t}`);
    if (fresh.length > 4) lines.push(`and ${fresh.length - 4} more`);
    notes.push({ tag: "follow", title: `${fresh.length} new roles at companies you follow`, body: lines.join("\n"), url: "/today/" });
  }
  return { notes, sent, known };
}

async function check() {
  const state = await readState();
  if (!state.on) return;
  const res = await fetch("/reminders.json", { cache: "no-store" });
  if (!res.ok) return;
  const { roles } = await res.json();
  const today = new Date().toLocaleDateString("en-CA");
  const out = plan(state, roles, today);
  // read again: the page may have saved a role meanwhile, and its fields win
  const now = await readState();
  await writeState({ ...now, sent: out.sent, known: out.known, checked: today });
  for (const n of out.notes) {
    await self.registration.showNotification(n.title, { body: n.body, tag: n.tag, icon: "/icons/icon-192.png", data: { url: n.url } });
  }
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === TAG) event.waitUntil(check());
});

// the page asks for a check right after reminders are turned on
self.addEventListener("message", (event) => {
  if (event.data === "reminders-check") event.waitUntil(check());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/today/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const win = list.find((w) => "navigate" in w);
      return win ? win.navigate(url).then((w) => (w || win).focus()) : self.clients.openWindow(url);
    }),
  );
});

// for scripts/test-reminders.mjs, which runs this file outside a browser
if (typeof module !== "undefined") module.exports = { plan, shortKey };
