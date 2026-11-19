"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormCountry } from "@/components/ShareForm";
import { limits, quickEnds as ends, quickTimeline, weekOptions, type Sending } from "@/lib/reportForm";
import { useTurnstile } from "@/lib/useTurnstile";

type Props = { countries: FormCountry[]; endpoint: string; siteKey: string; githubForm: string; onFull: () => void };

const platforms = ["No test", "HackerRank", "Codility", "CodeSignal", "TestGorilla", "SHL", "Other"];

/** The last 15 months, newest first: "November 2026". */
function months(): string[] {
  const d = new Date();
  return Array.from({ length: 15 }, (_, i) => new Date(d.getFullYear(), d.getMonth() - i, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
}

const label = "block font-sans text-[15px] font-semibold";
const field = "mt-1 block h-11 w-full rounded-md border border-muted bg-surface px-3 text-[16px] text-ink";

/** The short version of the share form: company, role, when, how far, which test, how long. About a minute.
 * It sends the same fields as the full form, so the Worker and the inbox read it the same way. */
export default function QuickShare({ countries, endpoint, siteKey, githubForm, onFull }: Props) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [end, setEnd] = useState("");
  const [test, setTest] = useState("");
  const [other, setOther] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [problem, setProblem] = useState("");
  const { token, widget, reset } = useTurnstile(siteKey);
  const monthList = useMemo(months, []);

  // from a company or role page: /share/?company=optiver&role=Software%20Engineer%20Intern
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const slug = p.get("company");
    if (slug && countries.some((k) => k.companies.some((c) => c.slug === slug))) setCompany(slug);
    if (p.get("role")) setRole(p.get("role")!.slice(0, limits.role));
  }, [countries]);

  const pick = countries.flatMap((k) => k.companies).find((c) => c.slug === company);
  const needsTest = end.startsWith("test-");

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("website")) return; // filled in by a bot
    if (!end) {
      setState("error");
      setProblem("Pick how far you got.");
      return;
    }
    if (!token) {
      setState("error");
      setProblem("The spam check hasn't finished yet. Wait a second and send again.");
      return;
    }
    const platform = test === "Other" ? other.trim() : test;
    const { timeline, outcome } = quickTimeline(end, platform);
    const body: Sending & { token: string } = {
      company,
      companyLabel: pick?.label ?? "",
      other: "",
      role: role.trim(),
      applied: String(f.get("applied") ?? ""),
      timeline,
      test: platform === "No test" ? "" : platform,
      weeks: String(f.get("weeks") ?? ""),
      outcome,
      notes: "",
      token,
    };
    setState("sending");
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
          I read every report before it goes on the company page, usually within a few days. Remember more of the
          steps?{" "}
          <button type="button" onClick={onFull} className="link">
            The full form
          </button>{" "}
          takes dates and notes too.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-5">
      <label className={label}>
        Company
        <select required value={company} onChange={(e) => setCompany(e.target.value)} className={field}>
          <option value="" disabled>
            Pick a company
          </option>
          {countries.map((k) => (
            <optgroup key={k.code} label={k.name}>
              {k.companies.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="mt-1 block text-[14px] font-normal text-dim">
          Not on the list?{" "}
          <button type="button" onClick={onFull} className="underline underline-offset-2">
            Use the full form
          </button>
          .
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Role
          <input
            required
            list="quick-roles"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            maxLength={limits.role}
            placeholder={pick?.roles[0] ?? "e.g. Software Engineer Intern"}
            className={field}
          />
          <datalist id="quick-roles">
            {pick?.roles.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className={label}>
          When did you apply?
          <select name="applied" required defaultValue="" className={field}>
            <option value="" disabled>
              Pick a month
            </option>
            {monthList.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className={label}>How far did you get?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ends.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={end === x.id}
              onClick={() => setEnd(x.id)}
              className={`min-h-11 rounded-full border px-4 py-2 text-left font-sans text-[15px] ${end === x.id ? "border-ink bg-ink font-semibold text-bg" : "border-line bg-surface text-ink hover:border-muted"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>Which online test?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {platforms.filter((t) => !(needsTest && t === "No test")).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={test === t}
              onClick={() => setTest(test === t ? "" : t)}
              className={`h-11 rounded-full border px-4 font-sans text-[15px] ${test === t ? "border-ink bg-ink font-semibold text-bg" : "border-line bg-surface text-ink hover:border-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {test === "Other" && (
          <input
            required
            value={other}
            onChange={(e) => setOther(e.target.value)}
            maxLength={60}
            placeholder="The platform's name"
            aria-label="The test platform"
            className={`${field} mt-2 sm:w-[320px]`}
          />
        )}
      </fieldset>

      <label className={`${label} sm:w-[320px]`}>
        Weeks from applying to the final answer
        <select name="weeks" defaultValue="" className={field}>
          <option value="">Skip</option>
          {weekOptions.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </label>

      {/* a field people don't see, so bots that fill in everything give themselves away */}
      <label className="hidden" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <label className="flex items-start gap-2.5 text-[16px] leading-[1.5]">
        <input type="checkbox" required className="mt-1 h-5 w-5 shrink-0" />
        <span>
          I&apos;m fine with this going on internradar.eu without my name.{" "}
          <Link href="/privacy/" className="link">
            Privacy
          </Link>
        </span>
      </label>

      <div ref={widget} />

      {state === "error" && (
        <p className="border-l-4 border-closed bg-surface px-3 py-2 text-[15px]" role="alert">
          {problem} If it keeps failing,{" "}
          <a href={githubForm} target="_blank" rel="noreferrer" className="link">
            the GitHub form
          </a>{" "}
          works too.
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="h-11 rounded-md bg-ink px-5 font-sans text-[15px] font-semibold text-bg hover:bg-muted disabled:opacity-60"
        data-track="share-quick-send"
      >
        {state === "sending" ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
