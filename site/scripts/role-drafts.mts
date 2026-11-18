// Turns what discover found into draft issues for the private inbox, at most --cap a night.
// It reads .discover.json, leaves out every posting that already has an issue (open or closed: a closed issue
// means "not for the list", for good), reads the posting itself for the rest, and writes one title and body
// per draft into --out. The inbox workflow makes the issues.
//
// Run: npm run role-drafts -- --seen seen.txt --cap 10 --out drafts/
// seen.txt is every earlier draft issue's body, one after the other.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import type { Board, Found } from "../lib/boards.ts";
import { json } from "../lib/fetchGently.ts";
import { draftsFor, htmlToText, pickNew, type RoleDraft } from "../lib/roleDraft.ts";

const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : "");
const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = arg("--out");
const cap = Math.max(0, Number(arg("--cap") || 10));
if (!out) {
  console.error("Run: npm run role-drafts -- --seen seen.txt --cap 10 --out drafts/");
  process.exit(2);
}
const seen = arg("--seen") && existsSync(arg("--seen")) ? readFileSync(arg("--seen"), "utf8") : "";
const { checkedAt, failed, found } = JSON.parse(readFileSync(join(site, ".discover.json"), "utf8")) as { checkedAt: string; failed: string[]; found: Found[] };

// ---------- what's new ----------

const picks = pickNew(found, seen);

// ---------- reading the posting ----------

const ashbyBoards = new Map<string, Promise<{ jobs: { id: string; descriptionPlain?: string; descriptionHtml?: string }[] } | null>>();

async function postingText(f: Found): Promise<string> {
  const b: Board = f.spec;
  if (b.ats === "greenhouse") {
    const d = await json<{ content?: string }>(`https://boards-api.greenhouse.io/v1/boards/${b.board}/jobs/${f.ref}`);
    return d?.content ? htmlToText(d.content) : "";
  }
  if (b.ats === "lever") {
    // the HTML, not the plain text: the plain text loses which lines are a list
    const d = await json<{ description?: string; lists?: { text: string; content: string }[]; additional?: string }>(
      `https://api${b.eu ? ".eu" : ""}.lever.co/v0/postings/${b.board}/${f.ref}`,
    );
    if (!d) return "";
    return [htmlToText(d.description ?? ""), ...(d.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`), htmlToText(d.additional ?? "")].join("\n");
  }
  if (b.ats === "ashby") {
    if (!ashbyBoards.has(b.board)) ashbyBoards.set(b.board, json(`https://api.ashbyhq.com/posting-api/job-board/${b.board}`));
    const j = (await ashbyBoards.get(b.board))?.jobs.find((x) => x.id === f.ref);
    return j ? (j.descriptionHtml ? htmlToText(j.descriptionHtml) : (j.descriptionPlain ?? "")) : "";
  }
  if (b.ats === "smartrecruiters") {
    const d = await json<{ jobAd?: { sections?: Record<string, { title?: string; text?: string }> } }>(
      `https://api.smartrecruiters.com/v1/companies/${b.board}/postings/${f.ref}`,
    );
    return Object.values(d?.jobAd?.sections ?? {})
      .map((s) => `${s.title ?? ""}\n${htmlToText(s.text ?? "")}`)
      .join("\n");
  }
  if (b.ats === "amazon") {
    // the job page is a web app; the search finds the job by its number and carries the whole text
    const d = await json<{ jobs: { id_icims: string; description?: string; basic_qualifications?: string; preferred_qualifications?: string }[] }>(
      `https://www.amazon.jobs/en/search.json?base_query=${f.ref}&result_limit=5`,
    );
    const j = d?.jobs.find((x) => x.id_icims === f.ref);
    return j
      ? [j.description, `Basic qualifications\n${j.basic_qualifications ?? ""}`, `Preferred qualifications\n${j.preferred_qualifications ?? ""}`].map((s) => htmlToText(s ?? "")).join("\n")
      : "";
  }
  if (b.ats === "oracle") {
    const d = await json<{ items: Record<string, string | undefined>[] }>(
      `${b.origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%22${f.ref}%22,siteNumber=${b.site}`,
    );
    const j = d?.items?.[0];
    return j
      ? ["ExternalDescriptionStr", "ExternalResponsibilitiesStr", "ExternalQualificationsStr"].map((k) => htmlToText(j[k] ?? "")).join("\n")
      : "";
  }
  if (b.ats === "eightfold") {
    const d = await json<{ data?: { jobDescription?: string } }>(`${b.origin}/api/pcsx/position_details?position_id=${f.ref}&domain=${b.domain}`);
    return d?.data?.jobDescription ? htmlToText(d.data.jobDescription) : "";
  }
  const d = await json<{ jobPostingInfo?: { jobDescription?: string } }>(`${b.origin}/wday/cxs/${b.tenant}/${b.site}${f.ref}`);
  return d?.jobPostingInfo?.jobDescription ? htmlToText(d.jobPostingInfo.jobDescription) : "";
}

// ---------- the drafts ----------

mkdirSync(out, { recursive: true });
const drafts: RoleDraft[] = [];
let unread = 0;
let used = 0;
for (const p of picks) {
  if (drafts.length >= cap) break;
  used++;
  const text = await postingText(p.f).catch(() => "");
  if (!text) unread++;
  drafts.push(...draftsFor(p.f, text, companies, checkedAt));
}

drafts.forEach((d, i) => {
  const n = String(i + 1).padStart(3, "0");
  writeFileSync(join(out, `${n}.title.txt`), d.issueTitle);
  writeFileSync(join(out, `${n}.body.md`), d.body + "\n");
});

const left = picks.length - used;
const summary = [
  `Night of ${checkedAt}: ${found.filter((f) => f.tech).length} tech roles on the boards that are not on the list, ${picks.length} without an issue yet.`,
  `${drafts.length} new drafts${unread ? `, ${unread} without the posting's text` : ""}. ${left} wait for a next night (at most ${cap} a night).`,
  failed.length ? `Could not read: ${failed.join(", ")}.` : "",
]
  .filter(Boolean)
  .join("\n");
writeFileSync(join(out, "summary.md"), summary + "\n");
console.log(summary);
