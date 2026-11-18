// Sends the weekly edition to Buttondown, every Monday after the night's deploy.
// It reads the live feed.xml, so the mail is exactly what the site shows that morning.
// MAIL_STATUS=draft (the default) leaves a draft in Buttondown to send by hand; about_to_send sends it.
// A second run in the same week does nothing: it first asks Buttondown for an email with the same subject.
// Run: BUTTONDOWN_API_KEY=... node scripts/mail-edition.mts [--dry]

import { isoWeek } from "../lib/edition.ts";
import { today } from "../lib/live.ts";

const API ="https://api.buttondown.com/v1";
const FEED = "https://internradar.eu/feed.xml";
const dry = process.argv.includes("--dry");
const key = process.env.BUTTONDOWN_API_KEY ?? "";
const status = process.env.MAIL_STATUS || "draft";

if (!["draft", "about_to_send"].includes(status)) throw new Error(`MAIL_STATUS must be draft or about_to_send, not ${status}`);
if (!key && !dry) throw new Error("BUTTONDOWN_API_KEY is not set");

const unescape = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "";

const res = await fetch(`${FEED}?t=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
if (!res.ok) throw new Error(`feed.xml answered ${res.status}`);
const item = tag(await res.text(), "item");
const subject = unescape(tag(item, "title"));
const guid = tag(item, "guid");
// the same week numbers the feed puts in its guid
const { year, week } = isoWeek(today());
if (guid !== `internradar-edition-${year}-w${week}`) {
  throw new Error(`The feed still has ${guid}, not week ${week} of ${year}. Did the night's deploy run?`);
}

const body = [
  `<p>The deadlines for this week and next, from <a href="https://internradar.eu/edition/">internradar.eu</a>.</p>`,
  unescape(tag(item, "description")),
  `<p>Every role with its hiring process: <a href="https://internradar.eu/">internradar.eu</a></p>`,
].join("\n");

if (dry) {
  console.log(`subject: ${subject}\nstatus: ${status}\n\n${body}`);
  process.exit(0);
}

const headers = { Authorization: `Token ${key}`, "Content-Type": "application/json" };
const seen = await fetch(`${API}/emails?subject=${encodeURIComponent(subject)}`, { headers });
if (!seen.ok) throw new Error(`Buttondown answered ${seen.status} on the list of emails: ${await seen.text()}`);
const found = ((await seen.json()) as { results?: { subject: string; status: string }[] }).results ?? [];
if (found.some((e) => e.subject === subject && e.status !== "deleted")) {
  console.log(`Already in Buttondown: ${subject}`);
  process.exit(0);
}

const made = await fetch(`${API}/emails`, { method: "POST", headers, body: JSON.stringify({ subject, body, status }) });
if (!made.ok) throw new Error(`Buttondown answered ${made.status}: ${await made.text()}`);
console.log(`${status === "draft" ? "Draft made" : "Sent"}: ${subject}`);
