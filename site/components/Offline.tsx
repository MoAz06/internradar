"use client";

import { useEffect } from "react";
import "@/lib/install";
import { FOLLOW_EVENT, SAVED_EVENT } from "@/lib/mine";
import { shareWithWorker } from "@/lib/reminders";

/** Starts the service worker (public/sw.js), so the site opens as an app and saved roles work offline.
 * Not on localhost, where it would get in the way of the dev server. Also hands the saved roles and followed
 * companies to the worker whenever they change, for the reminders. */
export default function Offline() {
  useEffect(() => {
    window.addEventListener(SAVED_EVENT, shareWithWorker);
    window.addEventListener(FOLLOW_EVENT, shareWithWorker);
    if ("serviceWorker" in navigator && location.hostname !== "localhost") navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener(SAVED_EVENT, shareWithWorker);
      window.removeEventListener(FOLLOW_EVENT, shareWithWorker);
    };
  }, []);
  return null;
}
