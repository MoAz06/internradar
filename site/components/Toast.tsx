"use client";

import { useEffect, useRef, useState } from "react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/toast";

const SHOW_MS = 5000;

/** Shows what lib/toast.ts sends: one line, an Undo button when there is something to undo, gone after 5 seconds.
 * Sits above the tabs in the installed app. Screen readers hear it through the live region. */
export default function Toast() {
  const [msg, setMsg] = useState<(ToastDetail & { n: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let n = 0;
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<ToastDetail>).detail;
      clearTimeout(timer.current);
      setMsg({ ...d, n: ++n });
      timer.current = setTimeout(() => setMsg(null), SHOW_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 app:bottom-[calc(4.25rem+env(safe-area-inset-bottom))]"
    >
      {msg && (
        <div
          key={msg.n}
          className="pointer-events-auto flex min-h-11 items-center gap-4 rounded-lg bg-ink py-1 pr-1.5 pl-4 font-sans text-[14px] text-bg shadow-lg"
        >
          <span>{msg.text}</span>
          {msg.undo && (
            <button
              type="button"
              onClick={() => {
                msg.undo?.();
                setMsg(null);
              }}
              className="h-10 rounded-md px-3 font-semibold text-bg underline underline-offset-2 hover:bg-bg/10"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
