"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { FOLLOW_EVENT, readFollowing, writeFollowing } from "@/lib/mine";
import { toast } from "@/lib/toast";

/** Follow a company in this browser: its new roles show on Today, and in the reminders if they're on. */
export default function FollowButton({ slug, name, plain = false }: { slug: string; name: string; plain?: boolean }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const read = () => setOn(readFollowing().includes(slug));
    read();
    window.addEventListener(FOLLOW_EVENT, read);
    return () => window.removeEventListener(FOLLOW_EVENT, read);
  }, [slug]);

  const flip = (quiet = false) => {
    const now = readFollowing();
    const next = !now.includes(slug);
    writeFollowing(next ? [...now, slug] : now.filter((s) => s !== slug));
    setOn(next);
    if (!quiet) toast(next ? `Following ${name}. New roles show on Today.` : `Stopped following ${name}`, () => flip(true));
  };

  if (plain)
    return (
      <button
        type="button"
        onClick={() => flip()}
        aria-pressed={on}
        data-track={on ? "unfollow" : "follow"}
        className={`flex h-11 items-center gap-1.5 font-sans text-[14px] ${on ? "font-semibold text-accent" : "text-link underline underline-offset-2"}`}
      >
        <Icon name="bell" filled={on} className="h-4 w-4" />
        {on ? `Following ${name}` : `Follow ${name}`}
      </button>
    );

  return (
    <button
      type="button"
      onClick={() => flip()}
      aria-pressed={on}
      data-track={on ? "unfollow" : "follow"}
      className={`flex h-11 items-center gap-2 rounded-md border px-4 font-sans text-[15px] font-semibold ${
        on ? "border-accent bg-accent text-bg" : "border-ink text-ink hover:bg-raised"
      }`}
    >
      <Icon name="bell" filled={on} className="h-[18px] w-[18px]" />
      {on ? "Following" : "Follow"}
      <span className="sr-only"> {name}</span>
    </button>
  );
}
