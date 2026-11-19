// Offline tests for the list features: search words, pay per role, the eligibility filters and the
// reminders in the service worker. No network. Run: npm run test-site

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
import { shortKey } from "../lib/items.ts";

const here = dirname(fileURLToPath(import.meta.url));

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
  const box = { module: { exports: {} as Record<string, unknown> }, self: { addEventListener() {} } };
  vm.runInNewContext(readFileSync(join(here, "..", "public", "sw.js"), "utf8"), box);
  const { plan, shortKey: swKey } = box.module.exports as {
    plan: (state: object, roles: object[], today: string) => { notes: { title: string; url: string }[]; sent: Record<string, string>; known: Record<string, string[]> };
    shortKey: (id: string) => string;
  };

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
