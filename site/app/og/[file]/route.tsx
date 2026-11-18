import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { companies, countries, lastChecked, radar } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { buildItems } from "@/lib/buildItems";
import { edition } from "@/lib/edition";
import { longDate } from "@/lib/format";
import { live, upcoming } from "@/lib/live";

export const dynamic = "force-static";
export const dynamicParams = false;

const pages = ["home", "edition", "radar", "reapply", "share", "alerts", "calendar", "about", "companies"];

export function generateStaticParams() {
  return [...pages, ...companies.map((c) => c.slug)].map((p) => ({ file: `${p}.png` }));
}

const font = (f: string) => readFileSync(join(process.cwd(), "assets/fonts", f));
const fonts = [
  { name: "Libre Baskerville", data: font("libre-baskerville-400.woff"), weight: 400 as const },
  { name: "Libre Baskerville", data: font("libre-baskerville-700.woff"), weight: 700 as const },
  { name: "Source Serif", data: font("source-serif-4-400.woff"), weight: 400 as const },
];

const paper = "#fff1e5";
const ink = "#33302e";
const muted = "#5a524d";
const claret = "#990f3d";
/** First sentence, if it is short enough; else the text cut at a word. */
const firstSentence = (s: string, n: number) => {
  const first = s.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? s;
  return cut(first, n);
};
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, "") + "…" : s);

/** What each preview says: a small label, a headline and one line under it. */
function text(page: string) {
  const items = buildItems();
  const open = items.filter((x) => x.status === "open" || x.status === "rolling").length;
  const nCountries = new Set(companies.map((c) => c.country)).size;
  if (page === "home")
    return {
      kicker: `Updated ${longDate(lastChecked)}`,
      head: "Tech internships in Europe, and how each company hires",
      sub: `${open} roles open at ${companies.length} offices in ${nCountries} countries, with the hiring process for each.`,
    };
  if (page === "edition") {
    const e = edition();
    return {
      kicker: `Week ${e.week}, ${e.year}`,
      head: e.title,
      sub: `${e.closingThis.length} closing this week, ${e.closingNext.length} the week after, ${e.opening.length} opening soon.`,
    };
  }
  if (page === "radar") {
    const next = upcoming(radar);
    return { kicker: "On the radar", head: "What opens next", sub: `${next.length} programmes and seasons with an expected opening date, from each company's own pages.` };
  }
  if (page === "reapply")
    return {
      kicker: "Re-apply rules",
      head: "When can you apply again after a rejection?",
      sub: `${reapplyRules.length} companies say it on their own pages. Shell turns a second try within 10 months down automatically.`,
    };
  if (page === "share")
    return { kicker: "Share your process", head: "How did your application go?", sub: "The steps, how long each took, and the outcome. It helps the next person. No questions, no names." };
  if (page === "alerts")
    return { kicker: "Alerts", head: "Know when something opens", sub: "New roles and deadlines in your calendar, feed reader or inbox, per country or per company." };
  if (page === "calendar")
    return { kicker: "Deadlines", head: "Every deadline in your own calendar", sub: "Google Calendar, Apple Calendar or Outlook. Subscribe once, it updates itself." };
  if (page === "about")
    return { kicker: "About", head: "How to read the list", sub: "Where the data comes from, and how to add to it." };
  if (page === "companies")
    return { kicker: "Companies", head: `${companies.length} companies, ${nCountries} countries`, sub: "Roles, process, re-apply rule and pay, from each company's own pages." };
  const c = companies.find((x) => x.slug === page)!;
  const k = countries.find((x) => x.code === c.country)?.name ?? c.country;
  const openHere = c.roles.filter((r) => ["open", "rolling"].includes(live(r).status)).length;
  const rule = /^not stated/i.test(c.reapply) ? "Re-apply rule: not stated." : `Re-apply rule: ${firstSentence(c.reapply, 150)}`;
  return {
    kicker: `${c.city}, ${k}`,
    head: `How ${c.name} hires`,
    sub: `${openHere} of ${c.roles.length} ${c.roles.length === 1 ? "role" : "roles"} open. ${rule}`,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const t = text(file.replace(/\.png$/, ""));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: paper, color: ink, padding: "48px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "Source Serif", fontSize: 24, color: muted }}>
          <span>Europe edition</span>
          <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 64, color: ink, lineHeight: 1 }}>internradar</span>
          <span>internradar.eu</span>
        </div>
        <div style={{ display: "flex", marginTop: 22, borderTop: `3px solid ${ink}`, borderBottom: `1px solid ${ink}`, height: 8 }} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
          <span style={{ fontFamily: "Source Serif", fontSize: 28, color: claret }}>{t.kicker}</span>
          <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 58, lineHeight: 1.15, marginTop: 10 }}>{t.head}</span>
          <span style={{ fontFamily: "Source Serif", fontSize: 30, lineHeight: 1.4, color: muted, marginTop: 22 }}>{t.sub}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
