"use client";

import { useEffect } from "react";
import "@/lib/install";
import { FOLLOW_EVENT, SAVED_EVENT } from "@/lib/mine";
import { shareWithWorker } from "@/lib/reminders";
import { PROFILE_EVENT } from "@/lib/profile";

/** Starts the service worker (public/sw.js), so the site opens as an app and saved roles work offline.
 * Not on localhost, where it would get in the way of the dev server. Also hands the saved roles and followed
 * companies and the profile to the worker whenever they change, for the reminders. */
export default function Offline() {
  useEffect(() => {
    window.addEventListener(SAVED_EVENT, shareWithWorker);
    window.addEventListener(FOLLOW_EVENT, shareWithWorker);
    window.addEventListener(PROFILE_EVENT, shareWithWorker);
    if ("serviceWorker" in navigator && location.hostname !== "localhost") navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener(SAVED_EVENT, shareWithWorker);
      window.removeEventListener(FOLLOW_EVENT, shareWithWorker);
      window.removeEventListener(PROFILE_EVENT, shareWithWorker);
    };
  }, []);
  return null;
}
