// Takes a sending from the share form on internradar.eu/share/, checks Turnstile,
// and opens an issue in the private inbox repo. Nothing is stored here.
// At night it also starts the nightly workflows on time (see the bottom of this file).

import { cleanSending, issueBody, issueTitle } from "../../site/lib/reportForm.ts";

export type Env = {
  INBOX_REPO: string; // "MoAz06/internradar-inbox"
  ALLOWED_ORIGINS: string; // comma separated
  TURNSTILE_SECRET: string;
  GITHUB_TOKEN: string;
  ACTIONS_TOKEN: string;
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

export async function handle(req: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
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
  const verdict = (await check.json().catch(() => ({}))) as { success?: boolean };
  if (!verdict.success) return json(403, { error: "The spam check failed. Reload the page and try again." }, ok);

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

// ---------- the night jobs ----------
// GitHub's own schedule starts them 8 to 9 hours late. Cloudflare's cron is on time, so each cron in
// wrangler.toml starts one workflow here. The schedule in the workflow stays as a spare: it skips the night
// when this one already ran.

export const wakeups: Record<string, { repo: string; workflow: string; ref: string }> = {
  // the site rebuilds, so passed deadlines show as closed in the morning
  "30 3 * * *": { repo: "MoAz06/internradar", workflow: "deploy.yml", ref: "master" },
  // new roles from the job boards, and the morning issue
  "15 4 * * *": { repo: "MoAz06/internradar-inbox", workflow: "roles.yml", ref: "main" },
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

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
  scheduled: (event: { cron: string }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) => ctx.waitUntil(wake(event.cron, env)),
};
