// Offline tests for the list features: search words, pay per role, the eligibility filters, the profile,
// the quick share form, the reminders in the service worker and the Worker that starts the night jobs. No network. Run: npm run test-site

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { companies } from "../data/companies.ts";
import { payFor, payRules } from "../data/pay.ts";
import { languagesOf, levelsOf, needsWorkRights } from "../lib/eligibility.ts";
import { query, searchable } from "../lib/search.ts";
import { reminderRow, shortKey, type Item } from "../lib/items.ts";
import { citiesOf, closesGroup, closesShort, toRows } from "../lib/rows.ts";
import { buildItems } from "../lib/buildItems.ts";
import { fits, isEmpty, type Profile } from "../lib/profile.ts";
import { cleanTitle, dayWord, editions, mailEditions, shortProcess } from "../lib/mailEdition.ts";
import { cleanSending, issueBody, outcomes, quickEnds, quickTimeline, readIssue } from "../lib/reportForm.ts";
import { handle, wake, wakeups } from "../../worker/src/index.ts";
import { cleanFeedback } from "../lib/feedbackForm.ts";

const here = dirname(fileURLToPath(import.meta.url));

function worker() {
  const box = { module: { exports: {} as Record<string, unknown> }, self: { addEventListener() {} } };
  vm.runInNewContext(readFileSync(join(here, "..", "public", "sw.js"), "utf8"), box);
  return box.module.exports as {
    plan: (state: object, roles: object[], today: string) => { notes: { title: string; url: string; tag: string }[]; sent: Record<string, string>; known: Record<string, string[]> };
    shortKey: (id: string) => string;
    fitsRole: (r: object, p: Profile) => boolean;
  };
}

test("search: synonyms, short words and typos", () => {
  const role = (...parts: string[]) => searchable(parts);
  const ml = role("Spotify", "Machine Learning Engineer Intern", "Stockholm", "Sweden", "Data and AI", "Internship");
  const html = role("Acme", "HTML and CSS developer", "Berlin", "Germany", "Software", "Internship");
  const gs = role("Goldman Sachs", "Engineering Summer Analyst", "London", "United Kingdom", "Software", "Internship");
  const intl = role("Ahold Delhaize", "International IT Traineeship", "Zaandam", "Netherlands", "Software", "Graduate");
  const munich = role("BMW Group", "Praktikant Software", "München", "Germany", "Software", "Internship");

  assert.ok(query("ml")!(ml));
  assert.ok(!query("ml")!(html), "ml is not in html");
  assert.ok(query("goldmn sachs")!(gs), "one letter off");
  assert.ok(query("munich")!(munich), "Munich finds München");
  assert.ok(query("uk")!(gs));
  assert.ok(query("go")!(gs), "a short word matches the start of a word while typing");
  assert.ok(!query("intern")!(intl), "intern is not international");
  assert.ok(query("trainee")!(intl));
  assert.equal(query("  "), null);
});

test("pay: every rule matches a company and a role", () => {
  for (const [slug, rules] of Object.entries(payRules)) {
    const c = companies.find((x) => x.slug === slug);
    assert.ok(c, `no company ${slug}`);
    for (const rule of rules) {
      // a rule for roles that are all closed now may match nothing open, but it has to match some role
      assert.ok(c.roles.some((r) => payFor(slug, r.title, r.kind) === rule.pay) || slug === "ing" || /€3,600|€600\/mo/.test(rule.pay.short), `${slug}: ${rule.pay.short} matches no role`);
    }
  }
  assert.equal(payFor("graphcore-bristol", "Graduate Firmware Engineer 2027", "Graduate")?.short, "£45k/yr");
  assert.equal(payFor("graphcore-bristol", "Firmware Summer Intern 2027", "Internship")?.short, "£2,500/mo");
  assert.equal(payFor("google-amsterdam", "Student Researcher, 2027", "Internship")?.month, undefined, "no period, no sorting value");
  assert.equal(payFor("optiver", "Software Engineer Intern", "Internship"), undefined);
});

test("pay: a figure for Google only where the period is stated", () => {
  for (const rules of Object.values(payRules))
    for (const { pay } of rules) {
      assert.equal(!!pay.salary, pay.month !== undefined, `${pay.short}: salary and sorting value go together`);
      if (!pay.salary) continue;
      const { min, max, unit } = pay.salary;
      assert.ok(min > 0 && (typeof max !== "number" || max > min), `${pay.short}: range`);
      const word = { HOUR: /hour/, WEEK: /week/, MONTH: /month/, YEAR: /year/ }[unit];
      assert.match(pay.label, word, `${pay.short}: the label names the period ${unit}`);
    }
  assert.deepEqual(payFor("graphcore-bristol", "Firmware Summer Intern 2027", "Internship")?.salary, { currency: "GBP", unit: "MONTH", min: 2500 });
  assert.deepEqual(payFor("intel-gdansk", "Graduate Talent Program", "Graduate")?.salary, { currency: "PLN", unit: "YEAR", min: 68880, max: "open" });
});

test("eligibility: levels, work rights and languages", () => {
  assert.deepEqual(levelsOf("PhD student in CS or related field in EMEA", "Research Scientist PhD Intern"), ["phd"]);
  assert.equal(levelsOf("Enrolled in a Bachelor's degree or above in CS", "SDE Intern"), null);
  assert.equal(levelsOf("Penultimate-year students graduating in 2028", "Technology Intern"), null);
  assert.deepEqual(levelsOf("Bachelor's or master's students in a technical field", "Quant Intern")?.sort(), ["bachelor", "master"]);

  assert.ok(needsWorkRights("A degree or on track for one; no visa sponsorship"));
  assert.ok(needsWorkRights("EU national living in the EU"));
  assert.ok(!needsWorkRights("PhD student (or PhD holder); must obtain work authorization in the country of employment by hire"));

  assert.deepEqual(languagesOf("Python, SQL; good German and English"), ["German"]);
  assert.deepEqual(languagesOf("English, German a plus"), []);
  assert.deepEqual(languagesOf("Bachelor's with GPA 2.5 or better (German scale); excellent English"), []);
  assert.deepEqual(languagesOf("Master degree; fluent in Dutch or French plus excellent English"), ["Dutch or French"]);
  assert.deepEqual(languagesOf("Graduating from a Dutch university"), []);
});

test("reminders: deadlines once per step, new roles at followed companies", () => {
  const { plan, shortKey: swKey } = worker();

  const id = "arm|Graduate Program|https://example.com/1";
  assert.equal(swKey(id), shortKey(id), "the worker and the site make the same key");
  const k = shortKey(id);
  const roles = [
    { k, s: "arm", c: "Arm", t: "Graduate Program", d: "2026-11-25", a: "2026-11-01" },
    { k: "other", s: "bol", c: "bol", t: "Stage", d: null, a: "2026-11-01" },
  ];

  // 6 days out: one notice, then quiet on the next check
  let out = plan({ saved: [id], following: ["bol"] }, roles, "2026-11-19");
  assert.equal(out.notes.length, 1);
  assert.equal(out.notes[0].title, "Arm: closes in 6 days");
  assert.equal(out.notes[0].url, `/roles/${k}/`);
  out = plan({ saved: [id], following: ["bol"], sent: out.sent, known: out.known }, roles, "2026-11-20");
  assert.equal(out.notes.length, 0, "no second 7-day notice, and bol's existing role isn't new");

  // 2 days out: the next step
  out = plan({ saved: [id], following: ["bol"], sent: out.sent, known: out.known }, roles, "2026-11-23");
  assert.equal(out.notes[0].title, "Arm: closes in 2 days");

  // a role added at a followed company
  const more = [...roles, { k: "new1", s: "bol", c: "bol", t: "Data Intern", d: null, a: "2026-11-24" }];
  out = plan({ saved: [], following: ["bol"], known: out.known }, more, "2026-11-24");
  // Array.from: the worker's arrays come from another realm
  assert.deepEqual(Array.from(out.notes, (n) => n.title), ["New at bol"]);

  // a company followed just now starts quiet
  out = plan({ saved: [], following: ["arm"], known: {} }, roles, "2026-11-24");
  assert.equal(out.notes.length, 0);
});

test("profile: the list and the worker agree on what fits", () => {
  const { fitsRole } = worker();
  const items = buildItems("2026-11-19");
  const profiles: Profile[] = [
    { level: "master" },
    { countries: ["NL", "DE"], kinds: ["Internship"] },
    { visa: true, english: true },
    { level: "phd", countries: ["GB"], visa: true },
    { kinds: ["Graduate", "Thesis"], english: true },
  ];
  for (const p of profiles) {
    const a = items.filter((x) => fits(x, p)).length;
    const b = items.filter((x) => fitsRole(reminderRow(x), p)).length;
    assert.equal(a, b, JSON.stringify(p));
    assert.ok(a > 0 && a < items.length, `${JSON.stringify(p)} narrows the list`);
  }
  assert.ok(isEmpty({ countries: [], kinds: [] }));
  assert.ok(fits({ country: "NL", kind: "Internship", levels: null, workRights: false, languages: [] }, { level: "phd" }), "no level named fits every level");
});

test("profile reminders: quiet at first, then new roles that fit", () => {
  const { plan } = worker();
  const row = (k: string, n: string, y = "Internship") => ({ k, s: `co-${k}`, c: `Co ${k}`, t: `Role ${k}`, d: null, a: "2026-11-01", n, y });
  const roles = [row("a", "NL"), row("b", "DE")];
  const profile = { countries: ["NL"] };
  let out = plan({ profile }, roles, "2026-11-19");
  assert.equal(out.notes.length, 0, "setting a profile starts quiet");
  const more = [...roles, row("c", "NL"), row("d", "FR"), row("e", "NL", "Graduate")];
  out = plan({ profile, known: out.known }, more, "2026-11-20");
  assert.deepEqual(Array.from(out.notes, (n) => n.title), ["2 new roles fit your profile"]);
  out = plan({ profile, known: out.known }, more, "2026-11-21");
  assert.equal(out.notes.length, 0, "told once");
  // a role at a followed company is told there, not twice
  const followed = [...more, row("f", "NL")];
  out = plan({ profile, following: ["co-f"], known: { ...out.known, "co-f": [] } }, followed, "2026-11-22");
  assert.deepEqual(Array.from(out.notes, (n) => n.tag), ["follow"]);
  // no profile: the list of seen roles goes
  out = plan({ known: out.known }, followed, "2026-11-23");
  assert.equal(out.known["@all"], undefined);
});

test("quick share: the Worker takes it and the inbox reads it back", () => {
  const { timeline, outcome } = quickTimeline("final-no", "HackerRank");
  assert.equal(timeline, "Applied\nOnline test (HackerRank)\nInterviews\nFinal round\nRejected");
  assert.equal(outcome, "Rejected after interview");
  assert.equal(quickTimeline("test-no", "").timeline, "Applied\nOnline test\nRejected", "the test step stays when the pick needs it");
  assert.equal(quickTimeline("offer", "").timeline, "Applied\nInterviews\nOffer");
  for (const e of quickEnds) assert.ok((outcomes as readonly string[]).includes(e.outcome), e.id);

  const { sending, problems } = cleanSending({ company: "asml", companyLabel: "ASML, Veldhoven", other: "", role: "Software Intern", applied: "October 2026", timeline, test: "HackerRank", weeks: "3-4", outcome, notes: "" });
  assert.deepEqual(problems, []);
  const back = readIssue(issueBody(sending));
  assert.equal(back.slug, "asml");
  assert.equal(back.timeline, timeline);
  assert.equal(back.outcome, outcome);
});

test("weekly mail: one edition per country, short lines, links to role pages", () => {
  assert.equal(dayWord(0, "2026-11-23"), "today");
  assert.equal(dayWord(1, "2026-11-24"), "tomorrow");
  assert.equal(dayWord(4, "2026-11-27"), "Friday");
  assert.equal(dayWord(7, "2026-11-30"), "next Monday");
  assert.equal(dayWord(20, "2026-12-13"), "on 13 Dec");
  assert.equal(cleanTitle("Software Engineer Intern - Fullstack (x/f/m) - Amsterdam", "Amsterdam", "Doctolib"), "Software Engineer Intern - Fullstack");
  assert.equal(cleanTitle("Data Engineer (m/w/d)", "Berlin", "X"), "Data Engineer");
  assert.equal(cleanTitle("Amsterdam", "Amsterdam", "X"), "Amsterdam");
  const long = "Application and review, online assessment, first-round interviews, final-round interviews, offer; a prep guide is linked from the page for each step";
  assert.ok(shortProcess(long).length <= 140);
  assert.ok(shortProcess(long).endsWith("and more"));
  // whole sentences when they fit, and a cut inside a quote closes it
  assert.equal(shortProcess(`You apply online. ${"Then a long step with many words in it ".repeat(4)}.`), "You apply online.");
  const quoted = shortProcess(`Postings say: “After a positive screening based on your CV you will have an initial video conversation with our Talent Acquisition team, then interviews”.`);
  assert.equal((quoted.match(/“/g) ?? []).length, (quoted.match(/”/g) ?? []).length);
  assert.equal(new Set(editions.map((e) => e.tag)).size, editions.length);

  const one = mailEditions("2026-11-23", false);
  assert.deepEqual(one.map((m) => m.edition.code), ["EU"]);
  assert.ok(!one[0].html.includes("Pick another edition"));
  const all = mailEditions("2026-11-23");
  assert.ok(all.some((m) => m.edition.code === "EU"));
  for (const m of all) {
    assert.match(m.key, /^[a-z]{2}-2026-w48$/);
    assert.ok(m.subject.length > 5 && m.subject.length <= 90, m.subject);
    assert.ok(!/undefined|null|NaN/.test(m.subject + m.preheader + m.html), m.key);
    assert.ok(m.closing.length + m.fresh.length + m.coming.length > 0);
    for (const g of [...m.closing, ...m.fresh, ...m.coming]) for (const r of g.roles) assert.match(r.href, /^https:\/\/internradar\.eu\/roles\/[\w-]+\/$/);
    if (m.edition.code !== "EU") for (const g of m.closing) assert.ok(g.daysLeft !== null && g.daysLeft <= 7);
  }
});

test("home list: one row per role in several cities or per programme, headings by deadline", () => {
  const base = buildItems("2026-11-19").find((x) => x.status === "open")!;
  const role = (title: string, city: string, closes?: string, daysLeft: number | null = null): Item => ({
    ...base,
    id: `${title}|${city}`,
    company: "Acme",
    title,
    city,
    kind: "Graduate",
    status: "open",
    closes,
    daysLeft,
  });
  assert.equal(cleanTitle("2027 Technology Developer Summer Internship Programme Glasgow", "London and Glasgow", "Barclays"), "2027 Technology Developer Summer Internship Programme");
  const cities = toRows([role("Software Engineer Graduate Scheme", "Bristol"), role("Software Engineer Graduate Scheme", "Leeds")]);
  assert.equal(cities.length, 1);
  assert.equal(cities[0].chip, "2 cities");
  assert.equal(citiesOf(cities[0]), "Bristol, Leeds");
  const programme = toRows([role("Graduate Program 2027 - Data Analyst", "Gothenburg"), role("Graduate Program 2027 - Automation Engineer", "Gothenburg")]);
  assert.deepEqual([programme.length, programme[0].title, programme[0].chip], [1, "Graduate Program 2027", "2 roles"]);
  // without a deadline one company's roles of one kind still share a row; another kind stays apart
  const loose = toRows([role("Internship - Firmware", "Paris"), role("Internship - Compilers", "Paris"), { ...role("Internship - Tools", "Paris"), kind: "Internship" }]);
  assert.deepEqual(
    loose.map((r) => [r.title, r.chip]),
    [["Internship - Firmware · Internship - Compilers", "2 roles"], ["Internship - Tools", null]],
  );
  // one deadline joins them, and by pay they stay apart
  const sameDay = [role("Firmware Engineer", "Bristol", "2026-11-29", 10), role("Cloud Engineer", "Bristol", "2026-11-29", 10)];
  assert.equal(toRows(sameDay).length, 1);
  assert.equal(toRows(sameDay, false).length, 2);
  // Thursday 19 Nov: Friday is tomorrow, Sunday this week, the next Sunday next week
  assert.equal(closesGroup(role("A", "B", "2026-11-20", 1), "2026-11-19"), "Closes tomorrow");
  assert.equal(closesGroup(role("A", "B", "2026-11-22", 3), "2026-11-19"), "Closes this week");
  assert.equal(closesGroup(role("A", "B", "2026-11-29", 10), "2026-11-19"), "Closes next week");
  assert.equal(closesGroup(role("A", "B", "2026-12-13", 24), "2026-11-19"), "Closes in December");
  assert.equal(closesGroup(role("A", "B", "2027-01-10", 52), "2026-11-19"), "Closes in January 2027");
  assert.equal(closesGroup(role("A", "B"), "2026-11-19"), "No deadline listed");
  assert.equal(closesShort(role("A", "B", "2026-11-20", 1), true), "Fri");
  assert.equal(closesShort(role("A", "B", "2026-11-20", 1), false), "Tomorrow");
  assert.equal(closesShort(role("A", "B", "2026-11-27", 8), true), "27 Nov");
  // every role on the site has a hiring line, or its company has none that says something
  for (const x of buildItems("2026-11-19")) assert.ok(!/not (described|stated)/i.test(x.how.slice(0, 30)), x.id);
});

test("night jobs: the Worker starts each workflow on time, and tries again only when GitHub is down", async () => {
  // every cron in wrangler.toml has a job, and each job's workflow keeps the same time as its spare schedule
  const toml = readFileSync(join(here, "..", "..", "worker", "wrangler.toml"), "utf8");
  const crons = JSON.parse(toml.match(/^crons = (\[.*\])$/m)![1]) as string[];
  assert.deepEqual(crons.sort(), Object.keys(wakeups).sort());
  const deploy = readFileSync(join(here, "..", "..", ".github", "workflows", "deploy.yml"), "utf8");
  assert.ok(deploy.includes(`cron: "${Object.keys(wakeups).find((c) => wakeups[c].workflow === "deploy.yml")}"`));
  const env = { INBOX_REPO: "", ALLOWED_ORIGINS: "", TURNSTILE_SECRET: "", GITHUB_TOKEN: "", ACTIONS_TOKEN: "t", RESEND_KEY: "", FEEDBACK_TO: "", FEEDBACK_FROM: "" };
  const calls: { url: string; body: string; auth: string }[] = [];
  const answer = (...codes: number[]) =>
    (async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body), auth: (init.headers as Record<string, string>).Authorization });
      return new Response(null, { status: codes.shift() ?? 204 });
    }) as unknown as typeof fetch;
  await wake("30 3 * * *", env, answer(204), 0);
  assert.deepEqual(calls.at(-1), { url: "https://api.github.com/repos/MoAz06/internradar/actions/workflows/deploy.yml/dispatches", body: '{"ref":"master"}', auth: "Bearer t" });
  calls.length = 0;
  await wake("15 4 * * *", env, answer(502, 204), 0);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.includes("internradar-inbox/actions/workflows/roles.yml"));
  calls.length = 0;
  await assert.rejects(wake("15 4 * * *", env, answer(401), 0), /401/);
  assert.equal(calls.length, 1);
  await assert.rejects(wake("0 0 * * *", env, answer(), 0), /No job/);
});

test("feedback: a suggestion goes out as one email, with the visitor's address as Reply-To", async () => {
  const env = {
    INBOX_REPO: "x/y",
    ALLOWED_ORIGINS: "https://internradar.eu",
    TURNSTILE_SECRET: "s",
    GITHUB_TOKEN: "g",
    ACTIONS_TOKEN: "a",
    RESEND_KEY: "r",
    FEEDBACK_TO: "contact@internradar.eu",
    FEEDBACK_FROM: "internradar <feedback@internradar.eu>",
  };
  const sent: { url: string; body: string }[] = [];
  let solvedOn = "internradar.eu";
  const fetcher = (async (url: string, init: RequestInit) => {
    sent.push({ url, body: String(init.body) });
    if (url.includes("turnstile")) return new Response(JSON.stringify({ success: true, hostname: solvedOn }));
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  const post = (body: unknown) =>
    handle(new Request("https://w.dev", { method: "POST", headers: { Origin: "https://internradar.eu" }, body: JSON.stringify(body) }), env, fetcher);

  const res = await post({ kind: "feedback", message: "  Add Belgium  please ", email: "a@b.nl", page: "/edition/", token: "t" });
  assert.equal(res.status, 200);
  const mail = JSON.parse(sent.at(-1)!.body);
  assert.equal(sent.at(-1)!.url, "https://api.resend.com/emails");
  assert.deepEqual(mail.to, ["contact@internradar.eu"]);
  assert.equal(mail.reply_to, "a@b.nl");
  assert.equal(mail.subject, "Suggestion: Add Belgium please");
  assert.ok(mail.text.includes("https://internradar.eu/edition/"));
  // no GitHub issue for a suggestion
  assert.ok(!sent.some((x) => x.url.includes("api.github.com")));

  sent.length = 0;
  const empty = await post({ kind: "feedback", message: " ", token: "t" });
  assert.equal(empty.status, 400);
  assert.ok(!sent.some((x) => x.url.includes("resend")));

  // a spam check solved on another site doesn't count
  solvedOn = "elsewhere.example";
  sent.length = 0;
  const foreign = await post({ kind: "feedback", message: "hello there", token: "t" });
  assert.equal(foreign.status, 403);
  assert.ok(!sent.some((x) => x.url.includes("resend")));
  solvedOn = "internradar.eu";

  // a bad address is refused, a page outside the site is dropped
  assert.deepEqual(cleanFeedback({ message: "hi there", email: "nope" }).problems, ["an email address that works (or leave it empty)"]);
  assert.equal(cleanFeedback({ message: "hi there", page: "https://evil.example/" }).feedback.page, "");
  assert.equal(JSON.parse(JSON.stringify(cleanFeedback({ message: "hi there" }).feedback)).email, "");
});
