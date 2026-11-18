"use client";

import { useEffect } from "react";
import "@/lib/install";

/** Starts the service worker (public/sw.js), so the site opens as an app and saved roles work offline.
 * Not on localhost, where it would get in the way of the dev server. */
export default function Offline() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || location.hostname === "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
