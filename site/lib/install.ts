// Chrome's "install this app" moment. Chrome fires beforeinstallprompt once the site counts as installable;
// we keep that event so the Install app button in the menu can open Chrome's own dialog later. Chrome's menu
// keeps its own Install entry either way. Listening starts when this module loads, before any component mounts.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let saved: InstallEvent | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    saved = e as InstallEvent;
    tell();
  });
  window.addEventListener("appinstalled", () => {
    saved = null;
    tell();
  });
}

export const canInstall = () => saved !== null;

export function onInstallChange(f: () => void) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

export async function install() {
  if (!saved) return;
  const e = saved;
  await e.prompt();
  await e.userChoice;
  saved = null;
  tell();
}
