"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTurnstile } from "@/lib/useTurnstile";
import { limits, outcomes, weekOptions } from "@/lib/reportForm";

export type FormCountry = { code: string; name: string; companies: { slug: string; label: string; roles: string[] }[] };

type Props = { countries: FormCountry[]; endpoint: string; siteKey: string; githubForm: string };

const OTHER = "other";
const field = "mt-1 block w-full border border-muted bg-surface px-3 py-2 text-[16px] text-ink placeholder:text-dim";
const label = "block text-[16px] font-semibold";
const hint = "mt-0.5 block text-[14px] font-normal text-dim";

export default function ShareForm({ countries, endpoint, siteKey, githubForm }: Props) {
  const [country, setCountry] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [problem, setProblem] = useState("");
  const { token, widget, reset } = useTurnstile(siteKey);

  // coming from a company page: /share/?company=optiver
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("company");
    const k = countries.find((x) => x.companies.some((c) => c.slug === slug));
    if (k && slug) {
      setCountry(k.code);
      setCompany(slug);
    }
  }, [countries]);

  const list = countries.find((k) => k.code === country)?.companies ?? [];
  const notListed = country === OTHER || company === OTHER;

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("website")) return; // filled in by a bot
    if (!token) {
      setState("error");
      setProblem("The spam check hasn't finished yet. Wait a second and send again.");
      return;
    }
    const pick = list.find((c) => c.slug === company);
    const body = {
      company: notListed ? "" : company,
      companyLabel: pick?.label ?? "",
      other: notListed ? f.get("other") : "",
      role: f.get("role"),
      applied: f.get("applied"),
      timeline: f.get("timeline"),
      test: f.get("test"),
      weeks: f.get("weeks"),
      outcome: f.get("outcome"),
      notes: f.get("notes"),
      token,
    };
    setState("sending");
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || `The server said ${r.status}.`);
      setState("sent");
      window.scrollTo({ top: 0 });
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
          I read every report before it goes on the company page, usually within a few days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Country
          <select
            required
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCompany("");
            }}
            className={field}
          >
            <option value="" disabled>
              Pick a country
            </option>
            {countries.map((k) => (
              <option key={k.code} value={k.code}>
                {k.name}
              </option>
            ))}
            <option value={OTHER}>Not on the list</option>
          </select>
        </label>
        {country && country !== OTHER && (
          <label className={label}>
            Company
            <select required value={company} onChange={(e) => setCompany(e.target.value)} className={field}>
              <option value="" disabled>
                Pick a company
              </option>
              {list.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
              <option value={OTHER}>Not on the list</option>
            </select>
          </label>
        )}
      </div>

      {notListed && (
        <label className={label}>
          Company and city
          <input name="other" required maxLength={limits.other} placeholder="e.g. Databricks, London" className={field} />
        </label>
      )}

      <label className={label}>
        Role
        <span className={hint}>The title on the posting.</span>
        <input name="role" required maxLength={limits.role} placeholder="e.g. Software Engineer Intern 2027" className={field} />
      </label>

      <label className={label}>
        When did you apply?
        <input name="applied" required maxLength={limits.applied} placeholder="e.g. October 2026" className={field} />
      </label>

      <label className={label}>
        Timeline
        <span className={hint}>One step per line, with the date or the days since the step before.</span>
        <textarea
          name="timeline"
          required
          rows={6}
          maxLength={limits.timeline}
          placeholder={"Applied 3 Nov\nOnline test invite 4 Nov, 7 days to finish\nScreening call 14 Nov, 45 min video\nWaiting"}
          className={field}
        />
      </label>

      <label className={label}>
        The online test, if there was one
        <span className={hint}>Platform, length, kind of problems. Not the questions.</span>
        <input name="test" maxLength={limits.test} placeholder="e.g. HackerRank, 90 minutes, three coding problems" className={field} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Weeks from applying to the final answer
          <select name="weeks" defaultValue="" className={field}>
            <option value="">Skip</option>
            {weekOptions.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Outcome
          <select name="outcome" required defaultValue="" className={field}>
            <option value="" disabled>
              Pick one
            </option>
            {outcomes.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={label}>
        Anything the next person should know
        <span className={hint}>A re-apply rule you were told, how fast they answered, what surprised you.</span>
        <textarea name="notes" rows={4} maxLength={limits.notes} className={field} />
      </label>

      {/* a field people don't see, so bots that fill in everything give themselves away */}
      <label className="hidden" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <label className="flex items-start gap-2.5 text-[16px] leading-[1.5]">
        <input type="checkbox" required className="mt-1 h-4 w-4 shrink-0" />
        <span>
          No test or interview questions and no names of recruiters or interviewers. I&apos;m fine with this going on
          internradar.eu without my name.{" "}
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
        className="bg-ink px-5 py-2.5 text-[15px] font-semibold text-bg hover:bg-muted disabled:opacity-60"
        data-track="share-send"
      >
        {state === "sending" ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
