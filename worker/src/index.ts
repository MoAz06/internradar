// Takes a sending from the share form on internradar.eu/share/, checks Turnstile,
// and opens an issue in the private inbox repo. A suggestion from internradar.eu/feedback/
// goes out as an email through Resend to the contact address instead.
// "Email me when X opens a role" from a company page is kept in KV (FOLLOWS) once the person
// confirms it from an email; each morning they get one email with the new roles (see follow below).
// At night it also starts the nightly workflows on time (see the bottom of this file).

import { cleanFeedback, feedbackMail } from "../../site/lib/feedbackForm.ts";
import { cleanSending, issueBody, issueTitle } from "../../site/lib/reportForm.ts";
import { alertMail, cleanFollow, confirmMail, link, MAX_COMPANIES, same, sign, SITE, userId, type Changes, type FollowEvent } from "../../site/lib/follow.ts";

/** The bits of Workers KV this file uses, so tests can hand in a Map. */
export type Store = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(o: { prefix: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
};

/** One address and the companies it follows. `since` is the day it was confirmed: older roles don't count. */
export type Follower = {
  email: string;
  companies: Record<string, { on: boolean; since: string; asked: string }>;
  /** ids of the roles already emailed, newest last */
  sent: string[];
};

export type Env = {
  INBOX_REPO: string; // "MoAz06/internradar-inbox"
  ALLOWED_ORIGINS: string; // comma separated
  TURNSTILE_SECRET: string;
  GITHUB_TOKEN: string;
  ACTIONS_TOKEN: string;
  RESEND_KEY: string; // secret, from resend.com
  FEEDBACK_TO: string; // "contact@internradar.eu"
  FEEDBACK_FROM: string; // "internradar <feedback@internradar.eu>", on the domain verified at Resend
  FOLLOWS: Store; // KV namespace with the company alerts
  FOLLOW_SECRET: string; // secret, signs the confirm and stop links
  FOLLOW_FROM: string; // "internradar <alerts@internradar.eu>"
  SELF_URL: string; // this Worker's own address, for the links in the emails
};

const json = (status: number, body: unknown, origin: string) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    },
  });

export async function handle(req: Request, env: Env, fetcher: typeof fetch = fetch, now = new Date()): Promise<Response> {
  // the links in the emails: a GET from the email, or the one-click POST a mail app sends
  const path = new URL(req.url).pathname;
  if (path === "/follow/confirm" || path === "/follow/stop") return followLink(req, env, now);

  const origin = req.headers.get("Origin") ?? "";
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  const ok = allowed.includes(origin) ? origin : allowed[0];
  if (req.method === "OPTIONS") return json(204, null, ok);
  if (req.method !== "POST") return json(405, { error: "Send the form with POST." }, ok);
  if (!allowed.includes(origin)) return json(403, { error: "This form only works on internradar.eu." }, ok);

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return json(400, { error: "The form arrived empty." }, ok);

  const check = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: String(raw.token ?? ""),
      remoteip: req.headers.get("CF-Connecting-IP") ?? "",
    }),
  });
  const verdict = (await check.json().catch(() => ({}))) as { success?: boolean; hostname?: string };
  // a token is only good on our own site: one solved somewhere else with the same site key doesn't count
  const hosts = allowed.map((o) => new URL(o).hostname);
  if (!verdict.success || !hosts.includes(verdict.hostname ?? ""))
    return json(403, { error: "The spam check failed. Reload the page and try again." }, ok);

  if (raw.kind === "feedback") return sendFeedback(raw, env, fetcher, ok);
  if (raw.kind === "follow") return startFollow(raw, env, fetcher, ok, now);

  const { sending, problems } = cleanSending(raw);
  if (problems.length) return json(400, { error: `Missing: ${problems.join(", ")}.` }, ok);

  const gh = await fetcher(`https://api.github.com/repos/${env.INBOX_REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "internradar-share",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: issueTitle(sending), body: issueBody(sending) }),
  });
  if (!gh.ok) {
    console.log("GitHub said", gh.status, await gh.text().catch(() => ""));
    return json(502, { error: "It didn't come through on my side." }, ok);
  }
  return json(200, { ok: true }, ok);
}

/** A suggestion goes to the inbox as an email. Reply-To is the visitor's address when they left one. */
async function sendFeedback(raw: Record<string, unknown>, env: Env, fetcher: typeof fetch, ok: string): Promise<Response> {
  const { feedback, problems } = cleanFeedback(raw);
  if (problems.length) return json(400, { error: `Missing: ${problems.join(", ")}.` }, ok);
  const { subject, text } = feedbackMail(feedback);
  const res = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "internradar-share",
    },
    body: JSON.stringify({
      from: env.FEEDBACK_FROM,
      to: [env.FEEDBACK_TO],
      subject,
      text,
      ...(feedback.email ? { reply_to: feedback.email } : {}),
    }),
  });
  if (!res.ok) {
    console.log("Resend said", res.status, await res.text().catch(() => ""));
    return json(502, { error: "It didn't come through on my side." }, ok);
  }
  return json(200, { ok: true }, ok);
}

// ---------- email alerts per company ----------

const amsterdamDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(d);

async function resend(env: Env, fetcher: typeof fetch, mail: Record<string, unknown>): Promise<boolean> {
  const res = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_KEY}`, "Content-Type": "application/json", "User-Agent": "internradar-share" },
    body: JSON.stringify({ from: env.FOLLOW_FROM, reply_to: env.FEEDBACK_TO, ...mail }),
  });
  if (!res.ok) console.log("Resend said", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/** The companies on the site and the night's new roles, from /changes.json. */
async function siteChanges(fetcher: typeof fetch): Promise<Changes | null> {
  const res = await fetcher(`${SITE}/changes.json?at=${Date.now()}`, { headers: { "User-Agent": "internradar-share" } });
  return res.ok ? ((await res.json().catch(() => null)) as Changes | null) : null;
}

async function readFollower(env: Env, user: string): Promise<Follower | null> {
  const raw = await env.FOLLOWS.get(`sub:${user}`);
  return raw ? (JSON.parse(raw) as Follower) : null;
}

/** The form on a company page: keep the request, unconfirmed, and send the email with the confirm link. */
async function startFollow(raw: Record<string, unknown>, env: Env, fetcher: typeof fetch, ok: string, now: Date): Promise<Response> {
  const { email, slug, problems } = cleanFollow(raw);
  if (problems.length) return json(400, { error: `Missing: ${problems.join(", ")}.` }, ok);
  const site = await siteChanges(fetcher);
  const company = site?.companies[slug];
  if (!company) return json(400, { error: "That company isn't on the list." }, ok);

  const user = await userId(email);
  const f: Follower = (await readFollower(env, user)) ?? { email, companies: {}, sent: [] };
  const had = f.companies[slug];
  if (had?.on) return json(200, { ok: true, already: true }, ok);
  if (!had && Object.keys(f.companies).length >= MAX_COMPANIES)
    return json(400, { error: `You follow ${MAX_COMPANIES} companies already. Stop one from an email first.` }, ok);
  // one confirm email per company per 10 minutes, so the form can't flood someone's inbox
  if (had && now.getTime() - Date.parse(had.asked) < 10 * 60_000) return json(200, { ok: true }, ok);

  f.companies[slug] = { on: false, since: "", asked: now.toISOString() };
  await env.FOLLOWS.put(`sub:${user}`, JSON.stringify(f));
  const { subject, text } = confirmMail(company, await link(env.SELF_URL, env.FOLLOW_SECRET, "on", user, slug));
  if (!(await resend(env, fetcher, { to: [email], subject, text }))) return json(502, { error: "The email didn't go out. Try again in a minute." }, ok);
  return json(200, { ok: true }, ok);
}

/** Confirm and stop links. Both check the signature, then send the person to a page on the site that says what happened. */
async function followLink(req: Request, env: Env, now: Date): Promise<Response> {
  const url = new URL(req.url);
  const on = url.pathname === "/follow/confirm";
  const user = url.searchParams.get("u") ?? "";
  const slug = url.searchParams.get("c") ?? "";
  const token = url.searchParams.get("t") ?? "";
  const back = (done: string) =>
    req.method === "POST"
      ? new Response(null, { status: done === "bad" ? 400 : 200 })
      : Response.redirect(`${SITE}/follow/?done=${done}&c=${encodeURIComponent(slug)}`, 303);
  if (!/^[0-9a-f]{32}$/.test(user) || !same(token, await sign(env.FOLLOW_SECRET, on ? "on" : "off", user, slug))) return back("bad");

  const f = await readFollower(env, user);
  if (on) {
    const c = f?.companies[slug];
    if (!f || !c) return back("gone");
    if (!c.on) {
      f.companies[slug] = { ...c, on: true, since: amsterdamDay(now) };
      await env.FOLLOWS.put(`sub:${user}`, JSON.stringify(f));
    }
    return back("on");
  }
  if (f) {
    if (slug === "*") f.companies = {};
    else delete f.companies[slug];
    if (Object.keys(f.companies).length === 0) await env.FOLLOWS.delete(`sub:${user}`);
    else await env.FOLLOWS.put(`sub:${user}`, JSON.stringify(f));
  }
  return back(slug === "*" ? "offall" : "off");
}

/** The morning run: one email per person with the new and opened roles at the companies they follow.
 * Resend's free plan sends 100 a day, so it stops at `limit` and the rest go the next morning.
 * It also forgets requests nobody confirmed within a week. */
export async function sendAlerts(env: Env, fetcher: typeof fetch = fetch, limit = 90, now = new Date()): Promise<{ sent: number; left: number }> {
  const site = await siteChanges(fetcher);
  if (!site) throw new Error("No /changes.json on the site.");
  const bySlug = new Map<string, FollowEvent[]>();
  for (const e of site.events) bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e]);

  let sent = 0;
  let left = 0;
  let cursor: string | undefined;
  do {
    const page = await env.FOLLOWS.list({ prefix: "sub:", cursor });
    for (const { name } of page.keys) {
      const raw = await env.FOLLOWS.get(name);
      if (!raw) continue;
      const f = JSON.parse(raw) as Follower;
      const unconfirmed = Object.keys(f.companies).filter((s) => !f.companies[s].on && now.getTime() - Date.parse(f.companies[s].asked) > 7 * 86_400_000);
      if (unconfirmed.length) {
        for (const s of unconfirmed) delete f.companies[s];
        if (Object.keys(f.companies).length === 0) {
          await env.FOLLOWS.delete(name);
          continue;
        }
        await env.FOLLOWS.put(name, JSON.stringify(f));
      }
      const done = new Set(f.sent);
      const due = Object.entries(f.companies)
        .filter(([, c]) => c.on)
        .flatMap(([slug, c]) => (bySlug.get(slug) ?? []).filter((e) => e.day >= c.since && !done.has(e.id)));
      if (due.length === 0) continue;
      if (sent >= limit) {
        left++;
        continue;
      }
      const user = name.slice(4);
      const stops: Record<string, string> = {};
      for (const slug of new Set(due.map((e) => e.slug))) stops[slug] = await link(env.SELF_URL, env.FOLLOW_SECRET, "off", user, slug);
      const stopAll = await link(env.SELF_URL, env.FOLLOW_SECRET, "off", user, "*");
      const { subject, text } = alertMail(due, stops, stopAll);
      const ok = await resend(env, fetcher, {
        to: [f.email],
        subject,
        text,
        headers: { "List-Unsubscribe": `<${stopAll}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      if (!ok) continue;
      sent++;
      f.sent = [...f.sent, ...due.map((e) => e.id)].slice(-300);
      await env.FOLLOWS.put(name, JSON.stringify(f));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  if (left) console.log(`${left} alert emails wait for tomorrow (limit ${limit}).`);
  return { sent, left };
}

// ---------- the night jobs ----------
// GitHub's own schedule starts them 8 to 9 hours late. Cloudflare's cron is on time, so each cron in
// wrangler.toml starts one workflow here. The schedule in the workflow stays as a spare: it skips the night
// when this one already ran, and the weekly mail skips the editions it made that week.

export const wakeups: Record<string, { repo: string; workflow: string; ref: string }> = {
  // the site rebuilds, so passed deadlines show as closed in the morning
  "30 3 * * *": { repo: "MoAz06/internradar", workflow: "deploy.yml", ref: "master" },
  // new roles from the job boards, and the morning issue
  "15 4 * * *": { repo: "MoAz06/internradar-inbox", workflow: "roles.yml", ref: "main" },
  // Mondays: the weekly mail, after the night's deploy. MON, not 1: on Cloudflare 1 is Sunday.
  "0 6 * * MON": { repo: "MoAz06/internradar", workflow: "mail.yml", ref: "master" },
};

export async function wake(cron: string, env: Env, fetcher: typeof fetch = fetch, pause = 30_000): Promise<void> {
  const w = wakeups[cron];
  if (!w) throw new Error(`No job for the cron "${cron}".`);
  let said = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetcher(`https://api.github.com/repos/${w.repo}/actions/workflows/${w.workflow}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ACTIONS_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "internradar-share",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: w.ref }),
    });
    if (res.status === 204) return;
    said = `${res.status} ${await res.text().catch(() => "")}`;
    // a wrong token or a missing workflow won't fix itself by trying again
    if (res.status < 500 && res.status !== 429) break;
    await new Promise((r) => setTimeout(r, pause * attempt));
  }
  throw new Error(`GitHub didn't start ${w.repo} ${w.workflow}: ${said}`);
}

/** The morning cron that sends the company alerts, after the night's deploys. */
export const ALERTS_CRON = "45 6 * * *";

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
  scheduled: (event: { cron: string }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) =>
    ctx.waitUntil(event.cron === ALERTS_CRON ? sendAlerts(env) : wake(event.cron, env)),
};
