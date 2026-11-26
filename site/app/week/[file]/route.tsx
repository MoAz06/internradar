import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { countries } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { shortDate } from "@/lib/format";
import { today } from "@/lib/live";
import type { Item } from "@/lib/items";
import { rolesFor, universities } from "@/lib/universities";
import { weekOf } from "@/lib/week";

// A square image for the week, for Instagram, LinkedIn or a group chat: what closes in the next seven days, else what
// is new. One for Europe, one per country and one per university. Made again every night, so it is always this week.

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return ["europe", ...countries.map((k) => k.slug), ...universities.map((u) => `near-${u.slug}`)].map((f) => ({ file: `${f}.png` }));
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
const line = "#d9d1c1";
const soon = "#a3421a";
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, "") + "…" : s);
// a title in capitals shouts next to the others, so it goes to sentence case
const calm = (s: string) => (/[a-z]/.test(s) ? s : s.charAt(0) + s.slice(1).toLowerCase());
const rowTitle = (x: Item) =>
  calm(x.title.toLowerCase().startsWith(`${x.company.toLowerCase()} `) ? x.title.slice(x.company.length + 1) : x.title).replace(/\s+[-–]\s+/g, ", ");

/** Who the image is for, its roles and the link under it. */
function scopeOf(file: string, items: Item[]): { where: string; roles: Item[]; link: string } | null {
  if (file === "europe") return { where: "Europe", roles: items, link: "internradar.eu" };
  const k = countries.find((c) => c.slug === file);
  if (k) return { where: k.name, roles: items.filter((x) => x.country === k.code), link: k.code === "NL" ? "internradar.eu/nl" : `internradar.eu/?country=${k.slug}` };
  const u = universities.find((x) => `near-${x.slug}` === file);
  if (u) {
    const f = rolesFor(u, items);
    return { where: f.where.replace(/^in /, ""), roles: f.roles, link: `internradar.eu/for/${u.slug}` };
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const now = today();
  const s = scopeOf(file.replace(/\.png$/, ""), buildItems(now))!;
  const w = weekOf(s.roles, now);
  const end = new Date(Date.parse(`${now}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: paper, color: ink, padding: "56px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "Source Serif", fontSize: 24, color: muted }}>
          <span>{`${shortDate(now)} to ${shortDate(end)}`}</span>
          <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 60, color: ink, lineHeight: 1 }}>internradar</span>
        </div>
        <div style={{ display: "flex", marginTop: 20, borderTop: `3px solid ${ink}`, borderBottom: `1px solid ${ink}`, height: 8 }} />
        <span style={{ fontFamily: "Source Serif", fontSize: 30, color: green, marginTop: 34 }}>{`Tech internships ${s.where === "Europe" ? "in Europe" : s.where.startsWith("near") ? s.where : `in ${s.where}`}`}</span>
        <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 60, lineHeight: 1.12, marginTop: 8 }}>{w.head}</span>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28, borderTop: `2px solid ${ink}` }}>
          {w.rows.map(({ x, tag }) => (
            <div key={x.id} style={{ display: "flex", flexDirection: "column", padding: "11px 0", borderBottom: `1px solid ${line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 29 }}>{cut(x.company, 30)}</span>
                <span style={{ fontFamily: "Source Serif", fontSize: 26, color: tag === "closes" ? soon : tag === "new" ? green : muted }}>
                  {tag === "closes" ? `Closes ${shortDate(x.closes!)}` : tag === "new" ? "New" : x.status === "rolling" ? "Rolling" : "Open"}
                </span>
              </div>
              <span style={{ fontFamily: "Source Serif", fontSize: 26, color: muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden" }}>{`${cut(rowTitle(x), 52)}, ${cut(x.city, 20)}`}</span>
            </div>
          ))}
        </div>
        <span style={{ marginTop: "auto", paddingTop: 18, fontFamily: "Source Serif", fontSize: 28, lineHeight: 1.35 }}>
          {`${w.open} open ${s.where === "Europe" ? `in ${countries.length} countries` : s.where.startsWith("near") ? s.where : `in ${s.where}`}, each with the hiring steps:`}
        </span>
        <span style={{ fontFamily: "Libre Baskerville", fontWeight: 700, fontSize: 34, color: green, marginTop: 4 }}>{s.link}</span>
      </div>
    ),
    { width: 1080, height: 1080, fonts },
  );
}
