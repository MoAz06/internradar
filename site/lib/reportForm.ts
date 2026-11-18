// The share form, in one place: the site form, the Worker that turns a sending into an issue,
// and the script that puts an approved issue into site/data all read these.

export const outcomes = [
  "Still in progress",
  "Offer",
  "Rejected after assessment",
  "Rejected after interview",
  "Withdrew",
  "Prefer not to say",
] as const;

export const weekOptions = ["under 1", "1-2", "3-4", "5-8", "more than 8", "still waiting"] as const;

/** Longest answer per field, in characters. */
export const limits = { other: 120, role: 120, applied: 40, timeline: 2000, test: 300, notes: 1500 } as const;

/** What the form sends. `company` is a slug, or "" with `other` filled in when it's not on the list. */
export type Sending = {
  company: string;
  companyLabel: string;
  other: string;
  role: string;
  applied: string;
  timeline: string;
  test: string;
  weeks: string;
  outcome: string;
  notes: string;
};

const oneLine = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
const block = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, max);

/** Cleans a sending and says what's missing. Nothing in here trusts the browser. */
export function cleanSending(raw: Record<string, unknown>): { sending: Sending; problems: string[] } {
  const slug = oneLine(raw.company, 80);
  const sending: Sending = {
    company: /^[a-z0-9-]+$/.test(slug) ? slug : "",
    companyLabel: oneLine(raw.companyLabel, 120),
    other: oneLine(raw.other, limits.other),
    role: oneLine(raw.role, limits.role),
    applied: oneLine(raw.applied, limits.applied),
    timeline: block(raw.timeline, limits.timeline),
    test: oneLine(raw.test, limits.test),
    weeks: (weekOptions as readonly string[]).includes(String(raw.weeks)) ? String(raw.weeks) : "",
    outcome: (outcomes as readonly string[]).includes(String(raw.outcome)) ? String(raw.outcome) : "",
    notes: block(raw.notes, limits.notes),
  };
  const problems: string[] = [];
  if (!sending.company && !sending.other) problems.push("company");
  if (!sending.role) problems.push("role");
  if (!sending.applied) problems.push("when you applied");
  if (!sending.timeline) problems.push("timeline");
  if (!sending.outcome) problems.push("outcome");
  return { sending, problems };
}

// The issue body uses the same headings as a GitHub issue form, so one reader handles both.
const heads = {
  company: "Company",
  role: "Role",
  applied: "When did you apply?",
  timeline: "Timeline",
  test: "The online test, if there was one",
  weeks: "Weeks from applying to the final answer",
  outcome: "Outcome",
  notes: "Anything the next person should know",
} as const;

export function issueTitle(s: Sending): string {
  const who = s.company ? s.companyLabel || s.company : s.other;
  return `[process] ${who}: ${s.role}`.slice(0, 200);
}

export function issueBody(s: Sending): string {
  const company = s.company ? `${s.companyLabel || s.company} (\`${s.company}\`)` : `Not on the list: ${s.other}`;
  const part = (h: string, v: string) => `### ${h}\n\n${v || "_No response_"}`;
  return [
    part(heads.company, company),
    part(heads.role, s.role),
    part(heads.applied, s.applied),
    part(heads.timeline, s.timeline),
    part(heads.test, s.test),
    part(heads.weeks, s.weeks),
    part(heads.outcome, s.outcome),
    part(heads.notes, s.notes),
  ].join("\n\n");
}

/** Reads an issue body back: the one above, or one from the GitHub issue form. */
export function readIssue(body: string): Record<keyof typeof heads, string> & { slug: string } {
  const parts = new Map<string, string>();
  for (const chunk of body.replace(/\r\n?/g, "\n").split(/^### /m).slice(1)) {
    const nl = chunk.indexOf("\n");
    const head = (nl < 0 ? chunk : chunk.slice(0, nl)).trim().toLowerCase();
    const value = (nl < 0 ? "" : chunk.slice(nl + 1)).trim();
    parts.set(head, value === "_No response_" ? "" : value);
  }
  const get = (h: string) => {
    const key = [...parts.keys()].find((k) => k === h.toLowerCase() || k.startsWith(h.toLowerCase().slice(0, 12)));
    return key ? (parts.get(key) ?? "") : "";
  };
  const company = get(heads.company);
  return {
    company,
    slug: company.match(/\(`([a-z0-9-]+)`\)/)?.[1] ?? "",
    role: get(heads.role) || get("Role and location"),
    applied: get(heads.applied),
    timeline: get(heads.timeline),
    test: get(heads.test),
    weeks: get(heads.weeks),
    outcome: get(heads.outcome),
    notes: get(heads.notes),
  };
}

/** Things a person should look at before a report goes live. Only hints: it never blocks. */
export function warnings(text: string): string[] {
  const out: string[] = [];
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) out.push("an email address");
  if (/(?:\+?\d[\s-]?){9,}/.test(text)) out.push("a phone number");
  if (/https?:\/\/|www\./i.test(text)) out.push("a link");
  if (/(^|\s)@\w{2,}/.test(text)) out.push("a handle like @name");
  if (/\b(recruiter|interviewer|manager|engineer|hr|talent|lead|ceo|cto|founder|with|by)\s+(named\s+)?[A-Z][a-z]+/.test(text) || /\b(Mr|Mrs|Ms|Dr)\.?\s+[A-Z]/.test(text))
    out.push("what may be a name");
  if (/\?\s*$/m.test(text) || /\b(they|he|she|interviewer)\s+asked\b|\bquestion(s)? (was|were)\b|\basked (me|us) (to|about|how|what|why)\b/i.test(text))
    out.push("what may be a test or interview question");
  return out;
}
