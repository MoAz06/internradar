// The suggestion form on /feedback/. The site and the Worker both use this, so the browser and the Worker agree on
// what goes in, and the Worker trusts nothing the browser says.

export const feedbackLimits = { message: 3000, email: 200, page: 200 } as const;

export type Feedback = { message: string; email: string; page: string };

const oneLine = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Cleans a suggestion and says what's missing. */
export function cleanFeedback(raw: Record<string, unknown>): { feedback: Feedback; problems: string[] } {
  const message = String(raw.message ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, feedbackLimits.message);
  const email = oneLine(raw.email, feedbackLimits.email);
  const page = oneLine(raw.page, feedbackLimits.page);
  const problems: string[] = [];
  if (message.length < 3) problems.push("your suggestion");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("an email address that works (or leave it empty)");
  // a path on the site only, so the mail never carries a link to somewhere else
  return { feedback: { message, email, page: /^\/[\w\-./?=&%]*$/.test(page) ? page : "" }, problems };
}

/** The email that lands in the inbox. */
export function feedbackMail(f: Feedback): { subject: string; text: string } {
  const first = f.message.replace(/\s+/g, " ");
  const subject = `Suggestion: ${first.length > 60 ? `${first.slice(0, 57)}...` : first}`;
  const text = [
    f.message,
    "",
    "---",
    `From the page: ${f.page ? `https://internradar.eu${f.page}` : "not given"}`,
    f.email ? `Reply goes to: ${f.email}` : "No email given, so no reply possible.",
  ].join("\n");
  return { subject, text };
}
