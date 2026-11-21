"use client";

import { useEffect, useState } from "react";

/** After someone confirms the weekly email, Buttondown sends them to /edition/?ref=confirmed. This tells them it worked. */
export default function Confirmed() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(new URLSearchParams(window.location.search).get("ref") === "confirmed");
  }, []);
  if (!show) return null;
  return (
    <p role="status" className="mb-6 border-l-4 border-accent bg-surface px-4 py-3 text-[16px] leading-snug">
      <span className="font-bold">You&apos;re subscribed.</span>{" "}
      Every Monday morning the new edition comes by email. This is this week&apos;s.
    </p>
  );
}
