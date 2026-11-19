// Puts the Monday email in Buttondown: one edition per country plus one for all of Europe (lib/mailEdition.ts).
//
// Readers pick their edition at sign-up; it becomes a Buttondown tag with the country's name, or "All of Europe".
// Each edition goes only to readers with that tag. "All of Europe" also goes to readers without any tag, such as
// everyone who signed up before there were editions. A country edition nobody has picked is skipped.
//
// MAIL_STATUS=draft (the default) leaves drafts to send by hand; about_to_send sends them.
// A second run in the same week skips the editions it made already (metadata.edition).
// Run: BUTTONDOWN_API_KEY=... node scripts/mail-edition.mts [--dry [--out dir]]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { editions, mailEditions } from "../lib/mailEdition.ts";
import { isoWeek } from "../lib/edition.ts";
import { today } from "../lib/live.ts";

const API = "https://api.buttondown.com/v1";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const outAt = args.indexOf("--out");
const outDir = outAt >= 0 ? args[outAt + 1] : "";
const key = process.env.BUTTONDOWN_API_KEY ?? "";
const status = process.env.MAIL_STATUS || "draft";

if (!["draft", "about_to_send"].includes(status)) throw new Error(`MAIL_STATUS must be draft or about_to_send, not ${status}`);
if (!key && !dry) throw new Error("BUTTONDOWN_API_KEY is not set");

const now = today();
const all = mailEditions(now);

if (dry) {
  for (const m of all) {
    console.log(`${m.key}  ${m.subject}\n    ${m.preheader}\n    closing ${m.closing.length} (+${m.closingMore}), new ${m.fresh.length} (+${m.freshMore}), opens soon ${m.coming.length}`);
  }
  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    const page = (m: (typeof all)[number]) =>
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${m.subject}</title><body style="margin:0;">${m.html}</body>`;
    for (const m of all) writeFileSync(join(outDir, `${m.key}.html`), page(m));
    writeFileSync(
      join(outDir, "index.html"),
      `<!doctype html><meta charset="utf-8"><title>Editions</title><ul style="font-family:sans-serif;line-height:2">${all.map((m) => `<li><a href="${m.key}.html">${m.edition.name}</a>: ${m.subject}`).join("")}</ul>`,
    );
    console.log(`\nWrote ${all.length} editions to ${outDir}`);
  }
  process.exit(0);
}

const headers = { Authorization: `Token ${key}`, "Content-Type": "application/json" };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`Buttondown answered ${res.status} on ${init.method ?? "GET"} ${path}: ${await res.text()}`);
  return (await res.json()) as T;
}

type Page<T> = { results: T[]; next: string | null; count: number };

async function allPages<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const p = await call<Page<T>>(`${path}${path.includes("?") ? "&" : "?"}page=${page}`);
    out.push(...p.results);
    if (!p.next) return out;
  }
}

// every edition has a tag readers can pick and change themselves
const tags = new Map((await allPages<{ id: string; name: string }>("/tags")).map((t) => [t.name, t.id]));
for (const e of editions) {
  if (tags.has(e.tag)) continue;
  const made = await call<{ id: string }>("/tags", {
    method: "POST",
    body: JSON.stringify({
      name: e.tag,
      public_description: e.code === "EU" ? "The weekly email for all countries" : `The weekly email for ${e.name}`,
      subscriber_editable: true,
    }),
  });
  tags.set(e.tag, made.id);
  console.log(`Tag made: ${e.tag}`);
}

// what was made this week already
const { monday } = isoWeek(now);
const made = await allPages<{ metadata?: { edition?: string } }>(`/emails?creation_date__start=${monday}`);
const done = new Set(made.map((m) => m.metadata?.edition).filter(Boolean));

for (const m of all) {
  const id = tags.get(m.edition.tag)!;
  if (done.has(m.key)) {
    console.log(`Already in Buttondown: ${m.key}`);
    continue;
  }
  if (m.edition.code !== "EU") {
    const readers = await call<Page<unknown>>(`/subscribers?tag=${encodeURIComponent(id)}&type=regular`);
    if (!readers.count) {
      console.log(`Nobody reads ${m.edition.name}: skipped`);
      continue;
    }
  }
  const has = { field: "subscriber.tags", operator: "contains", value: id };
  const filters =
    m.edition.code === "EU"
      ? { predicate: "or", groups: [], filters: [has, { field: "subscriber.tags", operator: "is_empty", value: "" }] }
      : { predicate: "and", groups: [], filters: [has] };
  await call("/emails", {
    method: "POST",
    body: JSON.stringify({ subject: m.subject, body: m.html, status, filters, template: "naked", metadata: { edition: m.key } }),
  });
  console.log(`${status === "draft" ? "Draft made" : "Sent"}: ${m.edition.name}, ${m.subject}`);
}
