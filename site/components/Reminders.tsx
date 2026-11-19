"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { remindersOn, remindersSupported, turnRemindersOff, turnRemindersOn, type TurnOn } from "@/lib/reminders";

type View = "loading" | "unsupported" | "browser" | "off" | "on";

const said: Record<Exclude<TurnOn, "on">, string> = {
  unsupported: "This browser can't send reminders. Put the dates in your calendar instead.",
  install: "Chrome only allows this for the installed app. Install it from the Chrome menu (Add to Home screen), then turn this on in the app.",
  denied: "Notifications are blocked for this site. Allow them in the site settings, then try again.",
};

/** One line to turn deadline and follow reminders on or off. Only the installed app on Android can have them. */
export default function Reminders({ className = "" }: { className?: string }) {
  const [view, setView] = useState<View>("loading");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!remindersSupported()) return setView("unsupported");
    if (!matchMedia("(display-mode: standalone)").matches) return setView("browser");
    remindersOn().then((on) => setView(on ? "on" : "off"));
  }, []);

  const on = async () => {
    setBusy(true);
    const r = await turnRemindersOn().catch((): TurnOn => "unsupported");
    setBusy(false);
    if (r === "on") {
      setView("on");
      setNote("");
    } else setNote(said[r]);
  };
  const off = async () => {
    await turnRemindersOff().catch(() => {});
    setView("off");
  };

  if (view === "loading") return <div className={`h-11 ${className}`} />;

  return (
    <div className={`font-sans text-[14px] leading-[1.5] ${className}`}>
      {view === "unsupported" && (
        <p className="text-muted">Reminders on your phone work in the installed app on Android. On iPhone and computers, put the dates in your calendar.</p>
      )}
      {view === "browser" && (
        <p className="text-muted">
          Install the app (Chrome menu, Add to Home screen) and it can remind you of saved deadlines, new roles at companies you follow and new roles that fit your profile.
        </p>
      )}
      {view === "off" && (
        <button type="button" onClick={on} disabled={busy} className="flex h-11 items-center gap-1.5 text-[15px] text-link underline underline-offset-2" data-track="reminders-on">
          <Icon name="bell" className="h-4 w-4" />
          Remind me of my deadlines
        </button>
      )}
      {view === "on" && (
        <p className="flex min-h-11 flex-wrap items-center gap-x-3 text-muted">
          <span className="flex items-center gap-1.5 font-semibold text-accent">
            <Icon name="bell" filled className="h-4 w-4" />
            Reminders are on
          </span>
          <span>7 and 2 days before a saved deadline, when a company you follow adds a role, and when a role that fits your profile is added.</span>
          <button type="button" onClick={off} className="h-11 text-link underline underline-offset-2" data-track="reminders-off">
            Turn off
          </button>
        </p>
      )}
      <p aria-live="polite" className="text-soon">
        {note}
      </p>
    </div>
  );
}
