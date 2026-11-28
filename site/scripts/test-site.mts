// Offline tests for the list features: search words, pay per role, the eligibility filters, the profile,
// the quick share form, the reminders in the service worker and the Worker that starts the night jobs. No network. Run: npm run test-site

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { companies, countries } from "../data/companies.ts";
import { roleHistory } from "../data/history.ts";
import { payFor, payRules } from "../data/pay.ts";
import { companyNoSponsor, languagesOf, levelsOf, needsClearance, needsWorkRights, relocationLines } from "../lib/eligibility.ts";
import { openRoles, toCsv } from "../lib/openRoles.ts";
import { firstSeen, seasonBefore, seasonOf, summerYear } from "../lib/seasons.ts";
import { reopenBlock } from "../lib/reopen.ts";
import { editRoleOf, roleBlockOf } from "../lib/dataFile.ts";
import { FEW, rolesFor, rolesNear, universities } from "../lib/universities.ts";
import { weekOf } from "../lib/week.ts";
import { testsOf, toolTag } from "../lib/tests.ts";
import { query, searchable } from "../lib/search.ts";
import { countryPageHref, postedAgo, postedWords, reminderRow, shortKey, type Item } from "../lib/items.ts";
import { allPlacePages, countryPages, fieldPlacePages, graduatePlacePages, inCountry, lowerField, placePagesFor, titleName } from "../lib/landing.ts";
import { changedPages } from "../lib/indexing.ts";
import { changeDays, countOf } from "../lib/changes.ts";
import { plan } from "./google-index.mts";
import { citiesOf, closesGroup, closesShort, payParts, toRows } from "../lib/rows.ts";
import { buildItems } from "../lib/buildItems.ts";
import { fits, isEmpty, type Profile } from "../lib/profile.ts";
import { cleanTitle, dayWord, editions, mailEditions, shortProcess } from "../lib/mailEdition.ts";
import { cleanSending, issueBody, outcomes, quickEnds, quickTimeline, readIssue } from "../lib/reportForm.ts";
import { ALERTS_CRON, handle, sendAlerts, wake, wakeups, type Env, type Follower, type Store } from "../../worker/src/index.ts";
import { alertMail, changesFrom, cleanFollow, sign, userId, type Changes } from "../lib/follow.ts";
import { cleanFeedback } from "../lib/feedbackForm.ts";
import { askAt, returnEvent } from "../lib/mine.ts";
import { shareUrl } from "../lib/share.ts";

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
  assert.equal(payFor("graphcore-bristol", "Graduate Firmware Engineer 2027", "Graduate")?.short, "≈ £3,750/mo");
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

test("pay: the pay column shows the figure, with the period below it", () => {
  assert.deepEqual(payParts("€3,840–6,170/mo"), { figure: "€3,840–6,170", period: "a month" });
  assert.deepEqual(payParts("€2,977/mo net"), { figure: "€2,977", period: "a month, net" });
  assert.deepEqual(payParts("£48,500"), { figure: "£48,500", period: "" });
  for (const rules of Object.values(payRules))
    for (const { pay } of rules) {
      const { figure, period } = payParts(pay.short);
      // the column is 100px wide, about 12 characters of 13px Inter
      assert.ok(figure.length <= 12, `${pay.short}: "${figure}" is too long for the pay column`);
      assert.match(period, /^((an hour|a day|a week|a month|a year)(, \w+)?)?$/, `${pay.short}: unknown period`);
    }
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

test("visa: a company line that says it sponsors no early careers role", () => {
  const no = (line: string, kind = "Internship") => companyNoSponsor([line], kind);
  assert.ok(no("Visa: “We cannot sponsor visas.”"));
  assert.ok(no("Visa: “Unfortunately we are unable to sponsor visa applications for any early careers vacancies.”", "Graduate"));
  assert.ok(no("Visa: “Sponsorship is not offered for graduate schemes.”", "Graduate"));
  assert.ok(!no("Visa: “Sponsorship is not offered for graduate schemes.”", "Internship"), "a line about graduates says nothing about interns");
  assert.ok(no("Visa: “visa sponsorship or support is unavailable for this role”. You need an existing right to work in the UK for the whole internship."));
  // one posting, a line that leaves room, a form question or no statement: not a rule for every role
  assert.ok(!no("Visa: the Software Engineering PhD Intern posting says applicants “will not be eligible for immigration sponsorship”."));
  assert.ok(!no("Visa (Engineering Graduate): the programme “does not satisfy the Home Office eligibility criteria for visa sponsorship”.", "Graduate"));
  assert.ok(!no("Visa: “We evaluate visa sponsorship on a case-by-case basis.”"));
  assert.ok(!no("Visa: postings ask for “a valid work and residence permit” if indicated; no sponsorship statement."));
  assert.ok(!no("Visa: the posting says you “Must obtain work authorization in the country of employment at the time of hire”; it does not say whether Meta sponsors."));
  assert.ok(!no("The form asks whether you need sponsorship to work in the UK. Whether Schonfeld sponsors is not stated."));
  assert.ok(!no("Visa sponsorship is available for international candidates, but not for interns."));
  // on the list: a company line counts for its roles
  const items = buildItems("2026-11-25");
  const leonardo = items.filter((x) => x.slug === "leonardo-uk");
  if (leonardo.length) assert.ok(leonardo.every((x) => x.workRights));
});

test("security clearance: the role's own line, or a company line for every candidate", () => {
  assert.ok(needsClearance("Graduating 2028; security clearance or able to get one", [], "Internship"));
  assert.ok(needsClearance("", ["All candidates must get security clearance. PA says time abroad can affect it."], "Graduate"));
  assert.ok(needsClearance("", ["Visa: You must be eligible for UK Security Clearance, normally SC."], "Internship"));
  // a line that leaves room is not a rule for every role
  assert.ok(!needsClearance("", ["Security: many roles need National Security Vetting."], "Internship"));
  assert.ok(!needsClearance("", ["Seatex: the job “may require clearance by the Norwegian National Security Authority”."], "Internship"));
  assert.ok(!needsClearance("Student in Computer Science", ["Pay: €500 a month."], "Internship"));
});

test("relocation: lines that name help with moving or housing, never the ones that say there is none", () => {
  const rel = (line: string, kind = "Internship") => relocationLines([line], kind).length > 0;
  assert.ok(rel("Housing: “DRW provides fully furnished apartments located close to the office”."));
  assert.ok(rel("Relocation: the postings say “Relocation Provided”.", "Graduate"));
  assert.ok(rel("Relocation for new grads: covered if you move to an office 50 miles or more from home.", "Graduate"));
  assert.ok(!rel("Relocation for new grads: covered if you move to an office 50 miles or more from home.", "Internship"), "a line about graduates says nothing about interns");
  assert.ok(!rel("Relocation: not mentioned."));
  assert.ok(!rel("Relocation: “Rabobank does not assist with relocation for junior positions.”"));
  assert.ok(!rel("Relocation: “on a case-by-case basis”, according to the entry-level FAQ."));
  assert.ok(!rel("Interview travel: IMC books flights and accommodation for onsite interviews."));
  assert.ok(!rel("Visa: “Ericsson supports work permits, but you’ll need to be based in, or ready to relocate to, the location of the role you apply for.”"));
  // "international" is not about interns
  assert.ok(rel("Graduate Programme: international applicants moving to a tech hub get “visa assistance, travel costs, and your first month of accommodation (conditions apply)”.", "Graduate"));
});

test("posting age: from the day the job board says it went up", () => {
  assert.equal(postedAgo("2026-11-25", "2026-11-25"), "today");
  assert.equal(postedAgo("2026-11-22", "2026-11-25"), "3d ago");
  assert.equal(postedAgo("2026-08-01", "2026-11-25"), "3mo ago");
  assert.equal(postedAgo("2026-11-26", "2026-11-25"), "");
  assert.equal(postedWords("2026-11-24", "2026-11-25"), "Posted yesterday");
  assert.equal(postedWords("2026-11-15", "2026-11-25"), "Posted 10 days ago");
  // only roles from a board that says so have it, and never a day after the build
  for (const x of buildItems("2026-11-25")) if (x.posted) assert.match(x.posted, /^\d{4}-\d{2}-\d{2}$/);
});

test("open roles as CSV: a header, one line a role, quotes where a cell needs them", () => {
  const rows = openRoles(buildItems("2026-11-25"));
  const csv = toCsv(rows);
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(lines.length, rows.length + 1);
  assert.ok(lines[0].startsWith("company,city,country,"));
  assert.ok(lines[0].includes("needsClearance") && lines[0].includes("posted"));
  const one = toCsv([{ ...rows[0], title: 'Intern, "Data"', tests: ["HackerRank", "HireVue"] }]).split("\r\n")[1];
  assert.ok(one.includes('"Intern, ""Data"""') && one.includes("HackerRank; HireVue"));
});

test("universities: unique pages, each with roles near it, and the week in one image", () => {
  const slugs = universities.map((u) => u.slug);
  assert.equal(new Set(slugs).size, slugs.length, "one page per university");
  const refs = universities.flatMap((u) => u.associations.map((a) => a.ref));
  assert.equal(new Set(refs).size, refs.length, "one ref per association");
  const items = buildItems("2026-11-26");
  const delft = rolesNear(universities.find((u) => u.slug === "tu-delft")!, items);
  assert.ok(delft.length > 10 && delft.every((x) => x.status !== "closed"));
  // a role in "Amsterdam and Eindhoven" is near, one only in Eindhoven isn't
  assert.ok(delft.some((x) => x.city.includes("Amsterdam")) && !delft.some((x) => x.city === "Eindhoven"));
  // every page has something to show, so no university gets an empty box on its association's site
  for (const u of universities) assert.ok(rolesFor(u, items).roles.length >= FEW || rolesFor(u, items).wide, `${u.name} has too few roles`);
  const chalmers = rolesFor(universities.find((u) => u.slug === "chalmers")!, items);
  if (rolesNear(universities.find((u) => u.slug === "chalmers")!, items).length < FEW) assert.equal(chalmers.where, "in Sweden");

  const w = weekOf(items, "2026-11-26");
  assert.match(w.head, /^\d+ tech (roles close|role closes|new|roles open|role open)/);
  assert.ok(w.rows.length <= 6, "six rows at most");
  // the head says what closes: the rows show those first, tagged, at most two per company
  if (w.closing) assert.ok(w.rows[0].tag === "closes" && w.rows.filter((r) => r.tag === "closes").length >= Math.min(w.closing, 2));
  for (const r of w.rows) assert.ok(r.tag !== "closes" || r.x.closes, "a closes tag has a date");
  for (const r of w.rows) assert.ok(w.rows.filter((y) => y.x.company === r.x.company).length <= 2);
  assert.equal(weekOf([], "2026-11-26").head, "0 tech roles open now");
});

test("open again: a role the nightly run closed, back on its board under the same link", () => {
  const block = (status: string, applications: string, closes = "") =>
    ["", "      {", '        title: "Intern",', `        status: "${status}",`, `        applications: "${applications}",`, ...(closes ? [`        closes: "${closes}",`] : []), '        checked: "2026-11-20",'].join("\n");
  const open = reopenBlock(block("closed", "The posting was taken down by 25 Nov 2026"), "2026-11-27");
  assert.ok(open?.includes('status: "open"') && open.includes("Open, no deadline listed") && open.includes('checked: "2026-11-27"'));
  assert.ok(reopenBlock(block("closed", "The posting was taken down by 25 Nov 2026", "2026-12-15"), "2026-11-27")?.includes("Closes"));
  // a deadline that passed, a role a person closed, or one that is open: left alone
  assert.equal(reopenBlock(block("closed", "The posting was taken down by 25 Nov 2026", "2026-11-20"), "2026-11-27"), null);
  assert.equal(reopenBlock(block("closed", "Closed for 2027, opens again in autumn"), "2026-11-27"), null);
  assert.equal(reopenBlock(block("open", "Open, no deadline listed"), "2026-11-27"), null);
});

test("closing a role: on a link several roles share, each company and each title gets its own", () => {
  const role = (title: string, status: string, url: string) =>
    ["      {", `        title: ${JSON.stringify(title)},`, `        status: "${status}",`, '        applications: "Open, no deadline listed",', `        source: ${JSON.stringify(url)},`, '        checked: "2026-11-20",', "      },"].join("\n");
  const company = (slug: string, roles: string[]) => ["  {", `    slug: "${slug}",`, "    roles: [", ...roles, "    ],", "  },"].join("\n");
  const shared = "https://x.example/jobs/1";
  const text = [
    "export const data = [",
    company("google-munich", [role("Student Researcher", "open", shared)]),
    company("google-zurich", [role("Student Researcher", "open", shared), role("SWE Intern", "open", shared)]),
    "];",
    "",
  ].join("\n");
  const close = (block: string) => block.replace(/(\n        status: )"[a-z]+",/, '$1"closed",');
  const closed = (s: string) => (s.match(/status: "closed"/g) ?? []).length;
  // the second company's role, not the first one in the file
  const zurich = editRoleOf(text, shared, close, "google-zurich", "Student Researcher")!;
  assert.equal(closed(zurich), 1);
  assert.ok(zurich.indexOf('status: "closed"') > zurich.indexOf('slug: "google-zurich"'));
  // the second title of the same company on the same link
  const swe = editRoleOf(zurich, shared, close, "google-zurich", "SWE Intern")!;
  assert.equal(closed(swe), 2);
  assert.ok(swe.includes('title: "SWE Intern",\n        status: "closed",'));
  // without a company: the first role on the link that is still open, never one that is closed already
  const munich = editRoleOf(swe, shared, close)!;
  assert.equal(closed(munich), 3);
  assert.equal(editRoleOf(munich, shared, close), null);
  // a company that isn't in this file, or a title it doesn't have on that link
  assert.equal(roleBlockOf(text, shared, "google-london"), null);
  assert.equal(roleBlockOf(text, shared, "google-munich", "SWE Intern"), null);
});

test("seasons: June to May, and the first day a company's role went up", () => {
  assert.equal(seasonOf("2026-11-25"), "2026-27");
  assert.equal(seasonOf("2027-05-31"), "2026-27");
  assert.equal(seasonOf("2026-07-13"), "2026-27", "quant postings in July are for next summer");
  assert.equal(seasonOf("2027-06-01"), "2027-28");
  assert.equal(seasonBefore("2026-27"), "2025-26");
  const c = companies[0];
  const r = c.roles[0];
  const id = `${c.slug}|${r.title}|${r.source}`;
  // a role on the list from the start doesn't count, a role that opened later does
  const history = { [id]: { added: "2026-11-16", statuses: [["2026-11-16", "soon"], ["2026-11-20", "open"]] as [string, string][] } };
  const seen = firstSeen({ ...c, roles: [{ ...r, source: "https://example.com/no-board-date" }] }, { [`${c.slug}|${r.title}|https://example.com/no-board-date`]: history[id] }, "2026-11-17");
  assert.equal(seen.get("2026-27")?.day, "2026-11-20");
  const fromStart = firstSeen({ ...c, roles: [{ ...r, source: "https://example.com/no-board-date" }] }, { [`${c.slug}|${r.title}|https://example.com/no-board-date`]: { added: "2026-11-16", statuses: [["2026-11-16", "open"]] } }, "2026-11-17");
  assert.equal(fromStart.size, 0);
});

test("online test tools: only names the company writes, never a guess", () => {
  assert.deepEqual(testsOf(["An email invitation to complete a coding challenge through Hackerrank, then a video interview."]), ["HackerRank"]);
  assert.deepEqual(testsOf(["You will be asked to participate in a recorded HireVue video interview.", "A CodeSignal skills assessment."]), ["CodeSignal", "HireVue"]);
  assert.deepEqual(testsOf(["An online test, then two interviews."]), [], "a test with no name names no tool");
  assert.deepEqual(testsOf(["Meets the eligibility criteria", "A qualified engineer"]), [], "ordinary words are no tool");
  assert.equal(toolTag(["HackerRank", "HireVue"]), "Test: HackerRank · Video: HireVue");
  assert.equal(toolTag([]), "");
  const items = buildItems("2026-11-25");
  assert.ok(items.some((x) => x.tests.includes("HackerRank")));
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
    // the naked template adds nothing, so without this the mail has no way to unsubscribe
    assert.ok(m.html.includes('<a href="{{ unsubscribe_url }}"'), m.key);
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
  // every cron starts a workflow, except the morning one that sends the company alert emails
  assert.ok(crons.includes(ALERTS_CRON));
  assert.deepEqual(crons.filter((c) => c !== ALERTS_CRON).sort(), Object.keys(wakeups).sort());
  const deploy = readFileSync(join(here, "..", "..", ".github", "workflows", "deploy.yml"), "utf8");
  assert.ok(deploy.includes(`cron: "${Object.keys(wakeups).find((c) => wakeups[c].workflow === "deploy.yml")}"`));
  // the weekly mail on Monday in both: MON in the Worker, since Cloudflare counts 1 as Sunday, and 1 in the workflow
  const mail = readFileSync(join(here, "..", "..", ".github", "workflows", "mail.yml"), "utf8");
  assert.equal(wakeups["0 6 * * MON"]?.workflow, "mail.yml");
  assert.ok(mail.includes('cron: "0 6 * * 1"'));
  // a weekday as a number is another day on Cloudflare than on GitHub, so a Worker cron names it
  for (const c of crons) assert.match(c.split(" ")[4], /^(\*|[A-Za-z]{3}([-,][A-Za-z]{3})*)$/, c);
  const env = { INBOX_REPO: "", ALLOWED_ORIGINS: "", TURNSTILE_SECRET: "", GITHUB_TOKEN: "", ACTIONS_TOKEN: "t", RESEND_KEY: "", FEEDBACK_TO: "", FEEDBACK_FROM: "" } as Env;
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
  calls.length = 0;
  await wake("0 6 * * MON", env, answer(204), 0);
  assert.deepEqual(calls.at(-1), { url: "https://api.github.com/repos/MoAz06/internradar/actions/workflows/mail.yml/dispatches", body: '{"ref":"master"}', auth: "Bearer t" });
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
  } as Env;
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

/** Workers KV as a Map, for the tests. */
function memoryStore(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (k) => data.get(k) ?? null,
    put: async (k, v) => void data.set(k, v),
    delete: async (k) => void data.delete(k),
    list: async ({ prefix }) => ({ keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
  };
}

test("company alerts: confirm by email, one morning email per person, stop with one click", async () => {
  const store = memoryStore();
  const env = {
    INBOX_REPO: "x/y",
    ALLOWED_ORIGINS: "https://internradar.eu",
    TURNSTILE_SECRET: "s",
    GITHUB_TOKEN: "g",
    ACTIONS_TOKEN: "a",
    RESEND_KEY: "r",
    FEEDBACK_TO: "contact@internradar.eu",
    FEEDBACK_FROM: "internradar <feedback@internradar.eu>",
    FOLLOWS: store,
    FOLLOW_SECRET: "secret",
    FOLLOW_FROM: "internradar <alerts@internradar.eu>",
    SELF_URL: "https://w.dev",
  } as Env;
  let changes: Changes = { built: "2026-11-24", companies: { imc: "IMC", optiver: "Optiver" }, events: [] };
  const mails: Record<string, unknown>[] = [];
  let mailDown = false;
  const fetcher = (async (url: string, init?: RequestInit) => {
    if (url.includes("turnstile")) return new Response(JSON.stringify({ success: true, hostname: "internradar.eu" }));
    if (url.startsWith("https://internradar.eu/changes.json")) return new Response(JSON.stringify(changes));
    if (url === "https://api.resend.com/emails") {
      if (mailDown) return new Response("{}", { status: 500 });
      mails.push(JSON.parse(String(init!.body)));
    }
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  const at = (iso: string) => new Date(iso);
  const follow = (body: Record<string, unknown>, now = at("2026-11-24T10:00:00Z")) =>
    handle(
      new Request("https://w.dev", { method: "POST", headers: { Origin: "https://internradar.eu" }, body: JSON.stringify({ kind: "follow", token: "t", ...body }) }),
      env,
      fetcher,
      now,
    );
  const open = (href: string, method = "GET") => handle(new Request(href, { method }), env, fetcher, at("2026-11-24T10:05:00Z"));
  // the button on the page behind a link
  const press = (href: string) =>
    handle(new Request(href, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "go=1" }), env, fetcher, at("2026-11-24T10:05:00Z"));
  const linkIn = (text: string, kind: string) => text.match(new RegExp(`https://w\\.dev/follow/${kind}\\?[^\\s]+`))![0];

  // the form: an unknown company or a bad address is refused, a good one gets a confirm email and nothing else
  assert.equal((await follow({ email: "a@b.nl", company: "nope" })).status, 400);
  assert.deepEqual(cleanFollow({ email: "nope", company: "imc" }).problems, ["an email address that works"]);
  assert.equal((await follow({ email: " A@B.nl ", company: "imc" })).status, 200);
  assert.equal(mails.length, 1);
  assert.deepEqual(mails[0].to, ["a@b.nl"]);
  assert.match(String(mails[0].subject), /IMC/);
  const user = await userId("a@b.nl");
  // the address is never the key, and never in a link
  assert.ok(store.data.has(`sub:${user}`));
  assert.ok(!String(mails[0].text).includes("a%40b") && !linkIn(String(mails[0].text), "confirm").includes("a@b"));
  // asking again within ten minutes sends no second email
  await follow({ email: "a@b.nl", company: "imc" }, at("2026-11-24T10:03:00Z"));
  assert.equal(mails.length, 1);
  // the email didn't go out: nothing is kept, so the next try sends it instead of saying "check your inbox"
  mailDown = true;
  assert.equal((await follow({ email: "i@j.nl", company: "imc" })).status, 502);
  assert.ok(!store.data.has(`sub:${await userId("i@j.nl")}`));
  mailDown = false;
  assert.equal((await follow({ email: "i@j.nl", company: "imc" })).status, 200);
  assert.equal(mails.length, 2);

  // nothing is sent before the click
  changes = { ...changes, events: [{ id: "k1:new", slug: "imc", company: "IMC", title: "SWE Intern", city: "Amsterdam", kind: "new", day: "2026-11-24", when: "Open", url: "https://internradar.eu/roles/k1/" }] };
  assert.deepEqual(await sendAlerts(env, fetcher, 90, at("2026-11-24T11:00:00Z")), { sent: 0, left: 0 });

  // opening the link shows a page with a button and changes nothing: mail scanners open links, people press buttons
  const confirm = linkIn(String(mails[0].text), "confirm");
  const page = await open(confirm);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<form method="post">[\s\S]*Turn the alerts on/);
  assert.match(await (await open(confirm)).text(), /Email alerts for IMC/);
  assert.equal((await open(confirm, "HEAD")).status, 200);
  assert.equal((JSON.parse(store.data.get(`sub:${user}`)!) as Follower).companies.imc.on, false);
  // the button with a wrong signature does nothing; the right one confirms and goes back to the site
  const bad = await press(confirm.replace(/t=[^&]+/, "t=wrong"));
  assert.equal(bad.headers.get("Location"), "https://internradar.eu/follow/?done=bad&c=imc");
  assert.equal((JSON.parse(store.data.get(`sub:${user}`)!) as Follower).companies.imc.on, false);
  const good = await press(confirm);
  assert.equal(good.status, 303);
  assert.equal(good.headers.get("Location"), "https://internradar.eu/follow/?done=on&c=imc");
  assert.equal((JSON.parse(store.data.get(`sub:${user}`)!) as Follower).companies.imc.since, "2026-11-24");

  // the morning: one email with the role, then never the same role again
  mails.length = 0;
  assert.deepEqual(await sendAlerts(env, fetcher, 90, at("2026-11-24T11:00:00Z")), { sent: 1, left: 0 });
  assert.equal(mails[0].subject, "IMC has a new role: SWE Intern");
  assert.ok(String(mails[0].text).includes("https://internradar.eu/roles/k1/"));
  assert.match((mails[0].headers as Record<string, string>)["List-Unsubscribe"], /follow\/stop/);
  assert.deepEqual(await sendAlerts(env, fetcher, 90, at("2026-11-24T11:00:00Z")), { sent: 0, left: 0 });
  // a role from before the confirm day doesn't count
  changes = { ...changes, events: [{ ...changes.events[0], id: "k0:new", day: "2026-11-23" }] };
  assert.deepEqual(await sendAlerts(env, fetcher, 90, at("2026-11-24T11:00:00Z")), { sent: 0, left: 0 });

  // stop: opening the link only shows the page; the one-click POST from a mail app stops it, and the address is gone
  const stop = linkIn(String(mails[0].text), "stop");
  assert.match(await (await open(stop)).text(), /Stop the alerts for IMC/);
  assert.ok(store.data.has(`sub:${user}`));
  assert.equal((await open(stop, "POST")).status, 200);
  assert.ok(!store.data.has(`sub:${user}`));
  // a stop link can't be made without the secret
  assert.notEqual(await sign("other", "off", user, "*"), await sign("secret", "off", user, "*"));

  // more than the day's limit waits for the next morning
  for (const e of ["c@d.nl", "e@f.nl"]) {
    const id = await userId(e);
    await store.put(`sub:${id}`, JSON.stringify({ email: e, companies: { imc: { on: true, since: "2026-11-20", asked: "" } }, sent: [] }));
  }
  mails.length = 0;
  assert.deepEqual(await sendAlerts(env, fetcher, 1, at("2026-11-24T11:00:00Z")), { sent: 1, left: 1 });

  // a request nobody confirmed is forgotten after a week
  await follow({ email: "g@h.nl", company: "imc" });
  const g = `sub:${await userId("g@h.nl")}`;
  assert.ok(store.data.has(g));
  await sendAlerts(env, fetcher, 90, at("2026-11-28T10:00:00Z"));
  assert.ok(store.data.has(g));
  await sendAlerts(env, fetcher, 90, at("2026-12-02T10:00:00Z"));
  assert.ok(!store.data.has(g));
});

test("company alerts: the night's changes are new roles and roles that just opened, from the last three days", () => {
  const now = "2026-11-24";
  const items = buildItems(now).slice(0, 3);
  const base = items[0];
  const fake = [
    { ...base, id: "a", key: "ka", added: "2026-11-24", status: "open" as const },
    { ...base, id: "b", key: "kb", added: "2026-11-01", status: "open" as const, opens: "2026-11-23" },
    { ...base, id: "c", key: "kc", added: "2026-11-10", status: "open" as const },
    { ...base, id: "d", key: "kd", added: "2026-11-20", status: "closed" as const },
    { ...base, id: "e", key: "ke", added: "2026-11-01", status: "rolling" as const },
  ];
  const history = { e: { added: "2026-11-01", statuses: [["2026-11-01", "soon"], ["2026-11-22", "rolling"]] as [string, string][] } };
  const got = changesFrom(fake, history, "2026-11-17", now).map((e) => `${e.id} ${e.day}`);
  assert.deepEqual(got, ["ka:new 2026-11-24", "kb:opened 2026-11-23", "ke:opened 2026-11-22"]);
  // a closed role that comes back, under a new link or as the same role: "open again"
  const again = changesFrom(
    [
      { ...base, id: "old", key: "kold", title: "Quant Intern", city: "Amsterdam", added: "2026-11-01", status: "closed" as const },
      { ...base, id: "new", key: "knew", title: "Quant  intern", city: "Amsterdam", added: "2026-11-24", status: "open" as const },
      { ...base, id: "f", key: "kf", title: "Other", added: "2026-11-01", status: "open" as const },
    ],
    { f: { added: "2026-11-01", statuses: [["2026-11-01", "open"], ["2026-11-10", "closed"], ["2026-11-23", "open"]] } },
    "2026-11-17",
    now,
  );
  assert.deepEqual(again.map((e) => `${e.id} ${e.again ?? false}`), ["knew:new true", "kf:opened true"]);
  assert.ok(alertMail([again[0]], { [base.slug]: "s" }, "a").subject.includes("opened a role again"));
  // the email names every company and gives a stop link for each
  const mail = alertMail(
    [
      { id: "1", slug: "imc", company: "IMC", title: "A", city: "Amsterdam", kind: "new", day: now, when: "Open", url: "u1" },
      { id: "2", slug: "drw", company: "DRW", title: "B", city: "Amsterdam", kind: "opened", day: now, when: "Open", url: "u2" },
    ],
    { imc: "stop-imc", drw: "stop-drw" },
    "stop-all",
  );
  assert.equal(mail.subject, "New roles at IMC and DRW");
  assert.ok(mail.text.includes("Stop IMC: stop-imc") && mail.text.includes("Stop all: stop-all"));
});

test("my applications: the share question opens the quick form at the right answer", () => {
  for (const a of Object.values(askAt)) if (a.end) assert.ok(quickEnds.some((e) => e.id === a.end), a.end);
  assert.equal(shareUrl("imc", "Software Engineer Intern", "test-wait"), "/share/?company=imc&role=Software%20Engineer%20Intern&end=test-wait#form");
  assert.equal(shareUrl("imc"), "/share/?company=imc#form");
});

test("returning visitors: one event a day, by how long since the first visit", () => {
  const first = returnEvent(null, "2026-11-24");
  assert.deepEqual(first, { event: "first-visit", seen: { first: "2026-11-24", last: "2026-11-24" } });
  assert.equal(returnEvent(first.seen, "2026-11-24").event, null);
  assert.equal(returnEvent(first.seen, "2026-11-25").event, "back-week-1");
  assert.equal(returnEvent(first.seen, "2026-12-01").event, "back-weeks-2-4");
  assert.equal(returnEvent(first.seen, "2026-12-22").event, "back-month-plus");
  assert.deepEqual(returnEvent({ first: "2026-11-24", last: "2026-11-25" }, "2026-11-26").seen, { first: "2026-11-24", last: "2026-11-26" });
});

test("country pages: one per country with a role, slugs as in the data, the Netherlands keeps /nl/", () => {
  const pages = countryPages();
  assert.ok(pages.length >= 10);
  for (const k of countries) assert.equal(countryPageHref(k.code, k.name), k.code === "NL" ? "/nl/" : `/countries/${k.slug}/`);
  const gb = pages.find((p) => p.code === "GB")!;
  assert.ok(gb.items.length > 50);
  assert.ok(gb.cities.some((c) => c.slug === "london"));
  assert.ok(gb.items.every((x) => x.status !== "closed"));
  assert.ok(pages.some((p) => p.code === "NL"));
  assert.equal(inCountry("United Kingdom"), "the United Kingdom");
  assert.equal(inCountry("Germany"), "Germany");
  assert.equal(titleName(gb), "the UK");
  assert.equal(summerYear("2026-11-28"), 2027);
  assert.equal(summerYear("2027-05-31"), 2027);
  assert.equal(summerYear("2027-06-01"), 2028);
});

test("search engine pings: role pages only in the plan, closed roles first, within the day's quota, no page twice", () => {
  const now = "2026-11-28";
  const c = changedPages(now);
  assert.ok(c.open.length > 500);
  assert.ok(c.open.every((u) => u.startsWith("https://internradar.eu/roles/")));
  assert.ok(c.updated.every((u) => c.open.includes(u)));
  assert.ok(c.deleted.every((u) => !c.open.includes(u)));
  assert.ok(c.lists.includes("https://internradar.eu/"));
  assert.ok(c.lists.includes("https://internradar.eu/countries/united-kingdom/"));
  const p = plan(now, 50);
  assert.equal(p.length, 50);
  assert.equal(new Set(p.map((n) => n.url)).size, 50);
  const firstOpen = p.findIndex((n) => n.type === "URL_UPDATED");
  assert.ok(p.slice(0, Math.max(firstOpen, 0)).every((n) => n.type === "URL_DELETED"));
  assert.ok(p.every((n) => n.url.startsWith("https://internradar.eu/roles/")));
  const all = plan(now, 5000);
  assert.ok(all.length >= c.open.length);
});

test("field pages per place: only pairs with enough roles, unique paths, the Netherlands under /nl/", () => {
  const pages = fieldPlacePages();
  assert.ok(pages.length >= 40);
  assert.equal(new Set(pages.map((p) => p.path)).size, pages.length);
  assert.ok(pages.every((p) => p.items.length >= 3 && p.companies >= 2 && p.what !== "Other tech" && p.what !== "Graduate"));
  assert.ok(pages.some((p) => p.path === "/cities/london/software/"));
  assert.ok(pages.some((p) => p.path === "/countries/united-kingdom/software/"));
  assert.ok(pages.filter((p) => p.code === "NL").every((p) => p.path.startsWith("/nl/")));
  assert.equal(lowerField("Data and AI"), "data and AI");
  assert.equal(lowerField("Software"), "software engineering");
});

test("graduate pages per place and the links a role gets back to its place pages", () => {
  const grads = graduatePlacePages();
  assert.ok(grads.length >= 5);
  assert.ok(grads.every((p) => p.what === "Graduate" && p.whatSlug === "graduate" && p.items.every((x) => x.kind === "Graduate")));
  assert.ok(grads.some((p) => p.path === "/countries/united-kingdom/graduate/"));
  assert.equal(new Set(allPlacePages().map((p) => p.path)).size, allPlacePages().length);
  const london = buildItems().find((x) => x.status === "open" && /^London$/.test(x.city) && x.field === "Software" && x.kind === "Internship")!;
  const back = placePagesFor(london).map((p) => p.path);
  assert.ok(back.includes("/cities/london/software/"));
  assert.ok(back.includes("/countries/united-kingdom/software/"));
  assert.ok(!back.some((p) => p.endsWith("/graduate/")));
});

test("change days: newest first, every day has a change, a role is not both added and opened on its first day", () => {
  const days = changeDays("2026-11-28");
  assert.ok(days.length >= 5);
  for (let i = 1; i < days.length; i++) assert.ok(days[i - 1].day > days[i].day);
  assert.ok(days.every((d) => countOf(d) > 0 && d.day > "2026-11-17" && d.day <= "2026-11-28"));
  for (const d of days) {
    const added = new Set(d.added.map((x) => x.key));
    assert.ok(!d.opened.some((x) => added.has(x.key)));
    // closed on that day by the history or by its deadline; it may well be open again today
    assert.ok(d.closed.every((x) => roleHistory[x.id]?.statuses.some(([day, s]) => day === d.day && s === "closed") || x.closes === d.day));
  }
});
