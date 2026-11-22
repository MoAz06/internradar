"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { feedbackLimits } from "@/lib/feedbackForm";
import { useTurnstile } from "@/lib/useTurnstile";

const label = "block font-sans text-[15px] font-semibold";
const field = "mt-1 block w-full rounded-md border border-muted bg-surface px-3 text-[16px] text-ink";

/** One box for a suggestion, an optional address for an answer. The Worker mails it to the contact address. */
export default function FeedbackForm({ endpoint, siteKey, contact }: { endpoint: string; siteKey: string; contact: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [problem, setProblem] = useState("");
  const [page, setPage] = useState("");
  const { token, widget, reset } = useTurnstile(siteKey);

  // the page they came from: ?from=/edition/, else the page on this site that linked here (the footer link)
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (from) return setPage(from);
    try {
      const r = new URL(document.referrer);
      if (r.origin === window.location.origin && !r.pathname.startsWith("/feedback")) setPage(r.pathname + r.search);
    } catch {}
  }, []);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("website")) return; // filled in by a bot
    if (!token) {
      setState("error");
      setProblem("The spam check hasn't finished yet. Wait a second and send again.");
      return;
    }
    setState("sending");
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "feedback", message: f.get("message"), email: f.get("email"), page, token }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || `The server said ${r.status}.`);
      setState("sent");
    } catch (err) {
      setState("error");
      setProblem(err instanceof Error ? err.message : "Something went wrong.");
      reset();
    }
  }

  if (state === "sent") {
    return (
      <div className="border-2 border-ink bg-surface p-4" role="status">
        <p className="text-[18px] font-bold">Thanks, it came in.</p>
        <p className="mt-1.5 text-[16px] leading-[1.55] text-muted">
          I read every suggestion. If you left your email, you&apos;ll hear back from me.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-5">
      <label className={label}>
        What would make internradar better?
        <textarea
          name="message"
          required
          minLength={3}
          maxLength={feedbackLimits.message}
          rows={6}
          placeholder="A company that's missing, something that's unclear, a feature you'd use..."
          className={`${field} py-2 leading-[1.5]`}
        />
      </label>

      <label className={`${label} sm:w-[420px]`}>
        Your email <span className="font-normal text-dim">(only if you&apos;d like an answer)</span>
        <input name="email" type="email" autoComplete="email" maxLength={feedbackLimits.email} className={`${field} h-11`} />
      </label>

      {/* a field people don't see, so bots that fill in everything give themselves away */}
      <label className="hidden" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <div ref={widget} />

      {state === "error" && (
        <p className="border-l-4 border-closed bg-surface px-3 py-2 text-[15px]" role="alert">
          {problem} If it keeps failing, mail{" "}
          <a href={`mailto:${contact}`} className="link">
            {contact}
          </a>
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="submit"
          disabled={state === "sending"}
          className="h-11 rounded-md bg-ink px-5 font-sans text-[15px] font-semibold text-bg hover:bg-muted disabled:opacity-60"
          data-track="feedback-send"
        >
          {state === "sending" ? "Sending..." : "Send"}
        </button>
        <span className="text-[14px] text-dim">
          No account needed.{" "}
          <Link href="/privacy/#suggestions" className="link">
            Where it goes
          </Link>
        </span>
      </div>
    </form>
  );
}
