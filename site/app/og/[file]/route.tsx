import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { companies, countries, lastChecked, radar } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { buildItems } from "@/lib/buildItems";
import { edition } from "@/lib/edition";
import { longDate, shortDate } from "@/lib/format";
import { live, upcoming } from "@/lib/live";
import type { Item } from "@/lib/items";

export const dynamic = "force-static";
export const dynamicParams = false;

const pages = ["home", "nl", "edition", "radar", "reapply", "share", "alerts", "calendar", "about", "companies", "pay"];

export function generateStaticParams() {
  return [...pages, ...companies.map((c) => c.slug)].map((p) => ({ file: `${p}.png` }));
}

const font = (f: string) => readFileSync(join(process.cwd(), "assets/fonts", f));
const fonts = [
  { name: "Libre Baskerville", data: font("libre-baskerville-400.woff"), weight: 400 as const },
  { name: "Libre Baskerville", data: font("libre-baskerville-700.woff"), weight: 700 as const },
  { name: "Source Serif", data: font("source-serif-4-400.woff"), weight: 400 as const },
];

const paper = "#f5f0e6";
const ink = "#1f2421";
const muted = "#4b5048";
const green = "#0f5a46";
/** First sentence, if it is short enough; else the text cut at a word. */
const firstSentence = (s: string, n: number) => {
  const first = s.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? s;
  return cut(first, n);
};
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, "") + "…" : s);

type Preview = { kicker: string; head: string; sub?: string; label?: string; rows?: Item[]; foot?: string };

/** The roles that close first, one per company, so the preview shows what is urgent that day. */
function closingFirst(items: Item[], n: number): Item[] {
  const seen = new Set<string>();
  return items
    .filter((x) => x.status === "open" && x.closes && (x.daysLeft ?? 0) > 0)
    .sort((a, b) => a.closes!.localeCompare(b.closes!))
    .filter((x) => !seen.has(x.slug) && !!seen.add(x.slug))
    .slice(0, n);
}

/** The Shell rule, while Shell states it: the strongest re-apply example on the list. */
const shellLine = () =>
  reapplyRules.some((r) => r.slug === "shell" && r.group === "wait") ? "Rejected by Shell? Apply again within 10 months and it's turned down automatically." : "";

/** What each preview says: a small label, a headline and one line under it, or a few roles for the list pages. */
function text(page: string): Preview {
  const items = buildItems();
  const isOpen = (x: Item) => x.status === "open" || x.status === "rolling";
  const open = items.filter(isOpen).length;
  const nCountries = new Set(companies.map((c) => c.country)).size;
  if (page === "home") {
    const shell = shellLine();
    return {
      kicker: `Updated ${longDate(lastChecked)} · ${open} roles open in ${nCountries} countries`,
      head: "Tech internships in Europe, and how each company hires",
      rows: closingFirst(items, 3),
      foot: shell && `${shell} Every company's re-apply rule is on the list.`,
    };
  }
  if (page === "nl") {
    const here = items.filter((x) => x.country === "NL" && isOpen(x));
    const shell = shellLine();
    const picnic = reapplyRules.some((r) => r.slug === "picnic" && r.group === "wait");
    return {
      label: "Netherlands",
      kicker: `Updated ${longDate(lastChecked)} · ${new Set(here.map((x) => x.slug)).size} companies`,
      head: `${here.length} tech internships and graduate roles in the Netherlands`,
      rows: closingFirst(here, 3),
      foot: shell && `${shell}${picnic ? " Picnic recommends a year." : ""}`,
    };
  }
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
  if (page === "pay") {
    const n = new Set(buildItems().filter((x) => x.pay).map((x) => x.slug)).size;
    return { kicker: "Pay", head: "What tech internships in Europe pay", sub: `The figures ${n} companies state on their own pages, per country, in their own currency.` };
  }
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

const line = "#d9d1c1";
const soon = "#a3421a";

/** The title without the company name in front, with dashes read as commas. */
const rowTitle = (x: Item) =>
  (x.title.toLowerCase().startsWith(`${x.company.toLowerCase()} `) ? x.title.slice(x.company.length + 1) : x.title).replace(/\s+[-–]\s+/g, ", ");

/** A role as one line: company, title, pay and the deadline. */
function Row({ x }: { x: Item }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", padding: "8px 0", borderBottom: `1px solid ${line}`, fontSize: 27 }}>
      <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, width: 190, flexShrink: 0, fontSize: 26 }}>{cut(x.company, 13)}</span>
      <span style={{ fontFamily: "Source Serif", flexGrow: 1, flexShrink: 1, marginRight: 18, whiteSpace: "nowrap", overflow: "hidden" }}>{cut(rowTitle(x), x.pay ? 40 : 50)}</span>
      {x.pay && <span style={{ fontFamily: "Source Serif", fontSize: 25, color: muted, flexShrink: 0, marginRight: 18 }}>{x.pay.short}</span>}
      <span style={{ fontFamily: "Source Serif", fontSize: 25, color: soon, flexShrink: 0 }}>{`Closes ${shortDate(x.closes!)}`}</span>
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const page = file.replace(/\.png$/, "");
  const t = text(page);
  const list = !!t.rows?.length;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: paper, color: ink, padding: "48px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "Source Serif", fontSize: 24, color: muted }}>
          <span>{t.label ?? "Europe edition"}</span>
          <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 64, color: ink, lineHeight: 1 }}>internradar</span>
          <span>{page === "nl" ? "internradar.eu/nl" : "internradar.eu"}</span>
        </div>
        <div style={{ display: "flex", marginTop: 22, borderTop: `3px solid ${ink}`, borderBottom: `1px solid ${ink}`, height: 8 }} />
        {list ? (
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
            <span style={{ fontFamily: "Source Serif", fontSize: 26, color: green, marginTop: 24 }}>{t.kicker}</span>
            <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 46, lineHeight: 1.15, marginTop: 6 }}>{t.head}</span>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 18, borderTop: `2px solid ${ink}` }}>
              {t.rows!.map((x) => (
                <Row key={x.id} x={x} />
              ))}
            </div>
            {t.foot && (
              <span style={{ marginTop: "auto", borderLeft: `5px solid ${soon}`, paddingLeft: 16, fontFamily: "Source Serif", fontSize: 26, lineHeight: 1.3 }}>{t.foot}</span>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
            <span style={{ fontFamily: "Source Serif", fontSize: 28, color: green }}>{t.kicker}</span>
            <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 58, lineHeight: 1.15, marginTop: 10 }}>{t.head}</span>
            <span style={{ fontFamily: "Source Serif", fontSize: 30, lineHeight: 1.4, color: muted, marginTop: 22 }}>{t.sub}</span>
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
