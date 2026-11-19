// Reminders on the phone, without an account or a server: the service worker (public/sw.js) wakes up about
// twice a day through Periodic Background Sync and reads what this file leaves in the cache. Chrome on Android
// allows that only for an installed app. Safari and Firefox don't have it.

import { readFollowing, readSaved } from "./mine.ts";
import { readProfile, type Profile } from "./profile.ts";

const STATE = "internradar-state";
const STATE_URL = "/__reminders-state";
const TAG = "internradar-reminders";

type State = { on?: boolean; saved?: string[]; following?: string[]; profile?: Profile | null };
type SyncRegistration = ServiceWorkerRegistration & {
  periodicSync: { register: (tag: string, o: { minInterval: number }) => Promise<void>; unregister: (tag: string) => Promise<void>; getTags: () => Promise<string[]> };
};

async function read(): Promise<State> {
  const hit = await (await caches.open(STATE)).match(STATE_URL);
  return hit ? hit.json() : {};
}

async function write(patch: State) {
  const s = { ...(await read()), ...patch };
  await (await caches.open(STATE)).put(STATE_URL, new Response(JSON.stringify(s), { headers: { "Content-Type": "application/json" } }));
}

export function remindersSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window && "Notification" in window && "periodicSync" in ServiceWorkerRegistration.prototype;
}

/** The service worker, or null when it isn't running (localhost, or not registered yet after a few seconds). */
async function worker(): Promise<SyncRegistration | null> {
  const ready = navigator.serviceWorker.ready as Promise<SyncRegistration>;
  return Promise.race([ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
}

export async function remindersOn(): Promise<boolean> {
  if (!remindersSupported()) return false;
  try {
    const reg = await worker();
    return !!reg && (await read()).on === true && (await reg.periodicSync.getTags()).includes(TAG) && Notification.permission === "granted";
  } catch {
    return false;
  }
}

export type TurnOn = "on" | "denied" | "install" | "unsupported";

export async function turnRemindersOn(): Promise<TurnOn> {
  if (!remindersSupported()) return "unsupported";
  const reg = await worker();
  if (!reg) return "unsupported";
  // Chrome grants background sync only to an installed app; ask about that before asking for notifications
  const sync = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName }).catch(() => null);
  if (sync?.state !== "granted") return "install";
  if ((await Notification.requestPermission()) !== "granted") return "denied";
  await reg.periodicSync.register(TAG, { minInterval: 12 * 60 * 60 * 1000 });
  await write({ on: true, saved: readSaved(), following: readFollowing(), profile: readProfile() });
  await reg.showNotification("Reminders are on", {
    body: "You'll hear about saved deadlines 7 and 2 days ahead and on the day, new roles at companies you follow, and new roles that fit your profile.",
    icon: "/icons/icon-192.png",
    tag: "on",
  });
  reg.active?.postMessage("reminders-check");
  return "on";
}

export async function turnRemindersOff() {
  const reg = await worker();
  await reg?.periodicSync.unregister(TAG).catch(() => {});
  await write({ on: false });
}

/** Called after the saved list, the followed companies or the profile change, so the worker sees the same lists. */
export function shareWithWorker() {
  if (typeof window === "undefined" || !("caches" in window)) return;
  read()
    .then((s) => (s.on ? write({ saved: readSaved(), following: readFollowing(), profile: readProfile() }) : undefined))
    .catch(() => {});
}
