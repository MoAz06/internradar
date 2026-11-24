"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

/** Cloudflare Turnstile, the spam check for the share forms. It only shows a box when it's unsure.
 * `active` false waits with loading it, for a form that only opens on a click. */
export function useTurnstile(siteKey: string, active = true) {
  const [token, setToken] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    const draw = () => {
      if (!widget.current || !window.turnstile || widgetId.current !== undefined) return;
      widgetId.current = window.turnstile.render(widget.current, {
        sitekey: siteKey,
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    };
    if (window.turnstile) return draw();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = draw;
    document.head.appendChild(s);
  }, [siteKey, active]);

  const reset = () => {
    setToken("");
    window.turnstile?.reset(widgetId.current);
  };
  return { token, widget, reset };
}
