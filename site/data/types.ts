export type Status = "open" | "soon" | "closed" | "rolling";

export type Role = {
  title: string;
  status: Status;
  /** What the careers page says about applications, in a few words. */
  applications: string;
  /** When applications open, only if the page names it. YYYY-MM-DD, or YYYY-MM if it only names the month. */
  opens?: string;
  /** Last day to apply, only if the posting names it. YYYY-MM-DD. */
  closes?: string;
  start: string;
  duration?: string;
  eligibility: string;
  /** Short process line for the table. */
  process: string;
  reapply: string;
  source: string;
  checked: string; // YYYY-MM-DD
};

export type CandidateReport = {
  role: string;
  applied: string; // "November 2026"
  timeline: string[];
  outcome: string;
  notes?: string;
};

export type Company = {
  slug: string;
  name: string;
  country: "NL" | "GB" | "DE" | "CH" | "IE" | "FR" | "SE" | "DK" | "FI" | "NO" | "ES" | "PT" | "PL" | "AT" | "BE" | "IT";
  city: string;
  careersUrl: string;
  roles: Role[];
  /** Process steps as the company describes them. */
  process: string[];
  reapply: string;
  pay: string[];
  reports: CandidateReport[];
  sources: { url: string; checked: string }[];
  /** Anything else worth knowing, from the same sources. */
  notes?: string[];
};

export type RadarItem = {
  opens: string;
  sortKey: string; // YYYY-MM for ordering
  company: string;
  slug: string;
  role: string;
  expect: string;
  kind: "soon" | "window";
};

export type Country = {
  code: Company["country"];
  name: string;
  /** Anchor on the home page and in the README, e.g. "netherlands". */
  slug: string;
  flag: string;
};
