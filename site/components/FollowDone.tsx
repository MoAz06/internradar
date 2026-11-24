"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const p = "mt-3 text-[17px] leading-[1.6] text-muted";

/** Reads ?done=on|off|offall|bad|gone&c=slug from the link in the email and says what happened. */
export default function FollowDone({ names }: { names: Record<string, string> }) {
  const [q, setQ] = useState<{ done: string; slug: string } | null>(null);
  useEffect(() => {
    const s = new URLSearchParams(window.location.search);
    setQ({ done: s.get("done") ?? "", slug: s.get("c") ?? "" });
  }, []);
  if (!q) return null;

  const name = names[q.slug];
  const company = name ? (
    <Link href={`/companies/${q.slug}/`} className="link">
      {name}
    </Link>
  ) : (
    "this company"
  );
  const [title, body] =
    q.done === "on"
      ? [
          "Confirmed",
          <>
            You get an email on the mornings {company} has a new role or opens one. Every email has a link to stop.
          </>,
        ]
      : q.done === "off"
        ? ["Stopped", <>No more emails about {company}. Other companies you follow still send theirs.</>]
        : q.done === "offall"
          ? ["Stopped all", <>No more company emails, and your address is deleted.</>]
          : q.done === "gone"
            ? ["This link has expired", <>A request nobody confirms is forgotten after a week. Ask again on the page of {company}.</>]
            : ["This link didn't work", <>It may be cut off. Copy the whole link from the email, or ask again on the company page.</>];

  return (
    <div role="status">
      <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]">{title}</h1>
      <p className={p}>{body}</p>
      <p className={p}>
        <Link href="/" className="link">
          See all roles
        </Link>
      </p>
    </div>
  );
}
