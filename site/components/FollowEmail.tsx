"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import { useTurnstile } from "@/lib/useTurnstile";

/** "Email me when X opens a role": a button that opens a small form. The Worker sends a confirm email first,
 * and only after that click an email on the mornings this company has a new role. */
export default function FollowEmail({ slug, name, endpoint, siteKey }: { slug: string; name: string; endpoint: string; siteKey: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "already" | "error">("idle");
  const [problem, setProblem] = useState("");
  // the spam check only loads once the form is open, so company pages stay light
  const { token, widget, reset } = useTurnstile(siteKey, open);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("website")) return; // filled in by a bot
    if (!token) {
      setState("error");
      setProblem("The spam check hasn't finished yet. Wait a second and try again.");
      return;
    }
    setState("sending");
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "follow", email: f.get("email"), company: slug, token }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; already?: boolean };
      if (!r.ok) throw new Error(j.error || `The server said ${r.status}.`);
      setState(j.already ? "already" : "sent");
    } catch (err) {
      setState("error");
      setProblem(err instanceof Error ? err.message : "Something went wrong.");
      reset();
    }
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-track="follow-email-open"
        className="flex h-11 items-center gap-2 rounded-md border border-line px-4 font-sans text-[15px] text-ink hover:bg-raised"
      >
        <Icon name="mail" className="h-[18px] w-[18px]" />
        Email me when {name} opens a role
      </button>
    );

  if (state === "sent" || state === "already")
    return (
      <p className="max-w-[460px] border-l-4 border-accent bg-surface px-3 py-2 text-[15px] leading-[1.5]" role="status">
        {state === "sent" ? (
          <>
            <span className="font-semibold">Check your inbox.</span> Click the link in the email to confirm. Nothing is sent before that.
          </>
        ) : (
          <>That address already gets an email when {name} opens a role.</>
        )}
      </p>
    );

  return (
    <form onSubmit={send} className="max-w-[460px]" data-track="follow-email">
      <label htmlFor={`follow-${slug}`} className="block font-sans text-[15px] font-semibold">
        Email me when {name} opens a role
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id={`follow-${slug}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          maxLength={200}
          placeholder="you@example.com"
          className="min-h-11 min-w-0 flex-1 border border-line bg-surface px-3 py-2 text-[16px]"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="min-h-11 bg-ink px-4 py-2 text-[15px] font-semibold text-bg hover:bg-muted disabled:opacity-60"
        >
          {state === "sending" ? "Sending..." : "Email me"}
        </button>
      </div>
      {/* a field people don't see, so bots that fill in everything give themselves away */}
      <label className="hidden" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div ref={widget} className="mt-2 empty:hidden" />
      {state === "error" && (
        <p className="mt-2 border-l-4 border-closed bg-surface px-3 py-2 text-[15px]" role="alert">
          {problem}
        </p>
      )}
      <p className="mt-1.5 text-[13px] leading-snug text-dim">
        Only on mornings {name} has a new role. Every email has a stop link.{" "}
        <Link href="/privacy/#company-alerts" className="link">
          Privacy
        </Link>
      </p>
    </form>
  );
}
