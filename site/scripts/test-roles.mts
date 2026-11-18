// Offline tests for the role drafts: finding the company entry, reading a posting, the draft issue and its checks,
// and writing into a data file. No network. Run: npm run test-roles

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import type { Company } from "../data/types.ts";
import { early, jobId, postingKey, type Found } from "../lib/boards.ts";
import { addSource, insertEntry } from "../lib/dataFile.ts";
import { checkRole, datesIn, draftsFor, fieldOf, htmlToText, kindOf, matchCompanies, pickNew, readPosting, readRoleIssue } from "../lib/roleDraft.ts";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const today = "2026-11-18";

const optiver = [
  { slug: "optiver", name: "Optiver", city: "Amsterdam" },
  { slug: "optiver-london", name: "Optiver", city: "London" },
];
const found = (over: Partial<Found>): Found => ({
  board: "greenhouse:optiver",
  spec: { ats: "greenhouse", board: "optiver" },
  companies: optiver,
  company: "Optiver",
  title: "Software Engineer Intern",
  url: "https://job-boards.greenhouse.io/optiver/jobs/7000000001",
  location: "Amsterdam, Netherlands",
  ref: "7000000001",
  posted: "2026-11-10",
  tech: true,
  ...over,
});

// a company entry to test against, without touching the real data
const fake: Company = {
  slug: "testco",
  name: "TestCo",
  country: "NL",
  city: "Delft",
  careersUrl: "https://example.com/careers",
  roles: [
    {
      title: "Existing Internship",
      kind: "Internship",
      field: "Software",
      status: "open",
      applications: "Open",
      start: "2027",
      eligibility: "Students",
      process: "CV, two interviews",
      reapply: "Not stated",
      source: "https://example.com/jobs/1",
      checked: today,
    },
  ],
  process: [],
  reapply: "Not stated",
  pay: [],
  reports: [],
  sources: [],
};
const all = [...companies, fake];

test("titles: early-career words, not Internal or International", () => {
  assert.ok(early.test("Software Engineering Intern (2027 Start)"));
  assert.ok(early.test("Werkstudent Softwareentwicklung"));
  assert.ok(!early.test("Internal Audit Manager"));
  assert.ok(!early.test("Director, International Tax Planning"));
  assert.equal(jobId("https://job-boards.greenhouse.io/imc/jobs/4945420101"), "4945420101");
});

test("company entry by city", () => {
  assert.deepEqual(matchCompanies(found({})).matched.map((c) => c.slug), ["optiver"]);
  assert.deepEqual(matchCompanies(found({ location: "London; Amsterdam" })).matched.map((c) => c.slug), ["optiver", "optiver-london"]);
  assert.deepEqual(matchCompanies(found({ location: "Chicago, IL" })).matched, []);
  const arm = [{ slug: "arm", name: "Arm", city: "Cambridge" }];
  assert.deepEqual(matchCompanies(found({ companies: arm, location: "Cambridge, MA" })).matched, [], "Cambridge in Massachusetts is not Cambridge");
  assert.deepEqual(matchCompanies(found({ companies: arm, location: "Cambridge, UK" })).matched.map((c) => c.slug), ["arm"]);
  const munich = [{ slug: "x", name: "X", city: "Munich" }];
  assert.equal(matchCompanies(found({ companies: munich, location: "München, Bayern" })).matched.length, 1);
  // the city only in the title
  assert.deepEqual(matchCompanies(found({ location: "In-Office", title: "Software Intern, London" })).matched.map((c) => c.slug), ["optiver-london"]);
  // nothing to go on, one entry: a guess
  const one = matchCompanies(found({ companies: [optiver[0]], location: "3 Locations" }));
  assert.equal(one.guess, true);
  assert.equal(one.matched.length, 1);
  // nothing to go on, two entries: no guess
  assert.equal(matchCompanies(found({ location: "3 Locations" })).matched.length, 0);
});

test("kind and field from the title", () => {
  assert.equal(kindOf("Software Engineer Internship (2027 Start)"), "Internship");
  assert.equal(kindOf("Graduate Software Engineer"), "Graduate");
  assert.equal(kindOf("Masterarbeit im Bereich KI"), "Thesis");
  assert.equal(kindOf("Werkstudent Data"), "Internship");
  assert.equal(kindOf("Something else"), "");
  assert.equal(fieldOf("Quantitative Research Intern"), "Quant");
  assert.equal(fieldOf("FPGA Engineer Intern"), "Hardware and embedded");
  assert.equal(fieldOf("Machine Learning Intern"), "Data and AI");
  assert.equal(fieldOf("Software Engineer Intern"), "Software");
  assert.equal(fieldOf("Graduate Programme"), "Other tech");
});

test("dates with a year only, and never a day and month that can be swapped", () => {
  assert.deepEqual(datesIn("Apply by 29 November 2026."), ["2026-11-29"]);
  assert.deepEqual(datesIn("The deadline is November 29th, 2026"), ["2026-11-29"]);
  assert.deepEqual(datesIn("Bewerbungsschluss: 15. Januar 2027"), ["2027-01-15"]);
  assert.deepEqual(datesIn("Closing date 03/04/2027"), []);
  assert.deepEqual(datesIn("Closing date 31/01/2027"), ["2027-01-31"]);
  assert.deepEqual(datesIn("Deadline 31 February 2027"), []);
  assert.deepEqual(datesIn("Apply by 29 November"), []);
});

test("reading a posting", () => {
  const text = [
    "About the role",
    "This is a 10-week internship in our Amsterdam office, starting in June 2027.",
    "We aim to respond within 2 weeks.",
    "Applications close on 15 January 2027.",
    "What we're looking for",
    "- Penultimate-year student in Computer Science",
    "- Good at C++ or Python",
    "Our process",
    "The process is an online test, then two interviews.",
  ].join("\n");
  const p = readPosting(text, "Software Engineer Intern");
  assert.equal(p.duration, "10 weeks");
  assert.equal(p.closes, "2027-01-15");
  assert.equal(p.start, "June 2027");
  assert.equal(p.rolling, false);
  assert.deepEqual(p.quotes.find((q) => q.head === "Eligibility")?.lines, ["Penultimate-year student in Computer Science", "Good at C++ or Python"]);
  assert.ok(p.quotes.find((q) => q.head === "Process"));
  // two different lengths: no value, only the lines
  assert.equal(readPosting("Internships last 10 weeks or 12 weeks, your choice.", "Intern").duration, "");
  assert.equal(readPosting("A 10 week internship.\nThe placement is 6 months.", "Intern").duration, "");
  // the start year in the title
  assert.equal(readPosting("", "Software Engineer Internship (2027 Start)").start, "2027");
  assert.equal(readPosting("We review applications on a rolling basis.", "Intern").rolling, true);
});

test("Greenhouse sends HTML inside entities", () => {
  assert.equal(htmlToText("&lt;h2&gt;About&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;C++ &amp;amp; Python&lt;/li&gt;&lt;/ul&gt;"), "About\n- C++ & Python");
});

test("a draft goes round: issue body, read back, blocked until checked", () => {
  const f = found({ companies: [{ slug: "testco", name: "TestCo", city: "Delft" }], location: "Delft, Netherlands", url: "https://example.com/jobs/2" });
  const [d] = draftsFor(f, "A 12 week internship.\nApply by 1 December 2026.", all, today);
  assert.equal(d.slug, "testco");
  assert.equal(d.key, `${postingKey(f)}@testco`);
  assert.ok(d.body.includes(`<!-- role-key: ${d.key} -->`));
  const r = readRoleIssue(d.body);
  assert.equal(r.slug, "testco");
  assert.equal(r.kind, "Internship (check)");
  assert.equal(r.duration, "12 weeks (check)");
  assert.equal(r.closes, "2026-12-01 (check)");
  assert.equal(r.applications, "Closes 1 Dec 2026 (check)");
  assert.equal(r.process, "CV, two interviews (check)", "taken from the other internship at the same company");
  const first = checkRole(r, all, today);
  assert.equal(first.role, null);
  assert.ok(first.blockers.some((b) => b.includes("(check)")));
  assert.ok(first.blockers.some((b) => b.includes("eligibility")));

  // what a person does: take the (check) away, write the eligibility
  const body = d.body
    .replaceAll(" (check)", "")
    .replace("### Eligibility\n\n_No response_", "### Eligibility\n\nMaster students in CS")
    .replace("### Start\n\n_No response_", "### Start\n\nNot stated");
  const ok = checkRole(readRoleIssue(body), all, today);
  assert.deepEqual(ok.blockers, []);
  assert.deepEqual(Object.keys(ok.role!), ["title", "kind", "field", "status", "applications", "closes", "start", "duration", "eligibility", "process", "reapply", "source", "checked"]);
  assert.equal(ok.role!.start, "Not stated");
});

test("checks that block", () => {
  const f = found({ companies: [{ slug: "testco", name: "TestCo", city: "Delft" }], location: "Delft", url: "https://example.com/jobs/3" });
  const clean = draftsFor(f, "", all, today)[0]
    .body.replaceAll(" (check)", "")
    .replace("### Eligibility\n\n_No response_", "### Eligibility\n\nStudents")
    .replace("### Start\n\n_No response_", "### Start\n\nNot stated");
  assert.deepEqual(checkRole(readRoleIssue(clean), all, today).blockers, []);
  const blocked = (body: string) => checkRole(readRoleIssue(body), all, today).blockers.join(" | ");
  assert.match(blocked(clean.replace("Students", "Students — any year")), /em dash/);
  assert.match(blocked(clean.replace("### Closes\n\n_No response_", "### Closes\n\n2026-11-01")), /has passed/);
  assert.match(blocked(clean.replace("### Closes\n\n_No response_", "### Closes\n\n2026-02-30")), /real date/);
  assert.match(blocked(clean.replace("### Kind\n\nInternship", "### Kind\n\nInternships")), /Kind "Internships"/);
  assert.match(blocked(clean.replaceAll("https://example.com/jobs/3", "https://example.com/jobs/1")), /already on the list/);
  assert.match(blocked(clean.replace("Software Engineer Intern", "Existing Internship")), /already has a role called/);
  assert.match(blocked(clean.replaceAll("https://example.com/jobs/3", "http://example.com/jobs/3")), /not an https link/);
  assert.match(blocked(clean.replace("Students", "x".repeat(401))), /eligibility is 401 characters/);
  const warned = checkRole(readRoleIssue(clean.replace("Students", "Passionate students who thrive")), all, today);
  assert.deepEqual(warned.blockers, []);
  assert.ok(warned.warnings.length > 0);
});

test("a city that has no entry yet can't be published", () => {
  const f = found({ location: "Berlin, Germany", url: "https://example.com/jobs/4" });
  const [d] = draftsFor(f, "", all, today);
  assert.equal(d.slug, "");
  assert.ok(d.key.endsWith("@new"));
  assert.match(d.issueTitle, /Optiver, Berlin, Germany/);
  assert.match(checkRole(readRoleIssue(d.body), all, today).blockers.join(" "), /isn't on the list yet/);
});

test("never twice: an earlier issue, open or closed, or the same role under a new posting id", () => {
  const a = found({});
  const [d] = draftsFor(a, "", all, today);
  assert.equal(pickNew([a], "").length, 1);
  assert.equal(pickNew([a], d.body).length, 0, "same posting");
  const repost = found({ url: "https://job-boards.greenhouse.io/optiver/jobs/7000000002", ref: "7000000002" });
  assert.equal(pickNew([repost], d.body).length, 0, "same title, same city, new id");
  assert.equal(pickNew([a, repost], "").length, 1, "both on one night");
  assert.equal(pickNew([found({ tech: false })], "").length, 0, "not tech");
  // entries on the list first, then the newest
  const order = pickNew(
    [found({ location: "Berlin", url: "u1", title: "A Intern" }), found({ posted: "2026-11-01", url: "u2", title: "B Intern" }), found({ posted: "2026-11-15", url: "u3", title: "C Intern" })],
    "",
  ).map((p) => p.f.url);
  assert.deepEqual(order, ["u3", "u2", "u1"]);
});

test("writing into a data file: role on top, link in the sources, reports still work", () => {
  // a Windows checkout has CRLF; the bot works on Linux checkouts with LF
  const text = readFileSync(join(dataDir, "nl.ts"), "utf8").replace(/\r\n/g, "\n");
  const role = { title: "New Role", kind: "Internship", field: "Software", status: "open", applications: "Open", start: "2027", eligibility: "Students", process: "CV", reapply: "Not stated", source: "https://example.com/new", checked: today };
  const withRole = insertEntry(text, "optiver", "roles", role)!;
  assert.ok(withRole.includes(`slug: "optiver",`));
  const at = withRole.indexOf(`slug: "optiver",`);
  assert.ok(withRole.indexOf('    roles: [\n      {\n        title: "New Role",', at) > at, "first in the list, same indent as the rest");
  const withSource = addSource(withRole, "optiver", role.source, today);
  const next = withSource.indexOf("\n    slug: ", at + 1);
  const block = withSource.slice(at, next);
  assert.ok(block.includes(`      { url: "https://example.com/new", checked: "${today}" },\n    ],`));
  assert.equal(addSource(withSource, "optiver", role.source, today), withSource, "not twice");
  assert.equal(insertEntry(text, "not-a-slug", "roles", role), null);
  const withReport = insertEntry(text, "optiver", "reports", { role: "X", applied: "May 2026", timeline: ["a"], outcome: "Offer" })!;
  assert.ok(withReport.length > text.length);
  // nothing else in the file moved
  assert.equal(withSource.replace(/      \{\n        title: "New Role",[\s\S]*?\n      \},\n/, "").replace(`\n      { url: "https://example.com/new", checked: "${today}" },`, ""), text);
});
