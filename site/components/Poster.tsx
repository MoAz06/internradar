"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { encode } from "uqr";

// The poster: a toolbar to pick the country and the name in the link, and one A4 sheet that prints on its own.
// Every size on the sheet is in cqw, a share of the sheet's width, so the same sheet fits a phone and a page.
// It is made to be read from a few metres: one big number, one deadline that matters, and a QR code you can't miss.

type Row = { key: string; n: number; closes: string; company: string; what: string; city: string };

export type PosterData = {
  code: string;
  name: string;
  /** Where the QR code goes, before ?ref=. */
  path: string;
  /** The link as the sheet prints it. */
  shown: string;
  open: number;
  companies: number;
  /** One row per company, deadline and kind, soonest first. */
  rows: Row[];
  /** Open roles without a deadline, newest first, for when few roles have one. */
  fill: Row[];
  soon: { company: string; what: string; opens: string }[];
  /** Every company with an open role, the names students know first. */
  names: string[];
  hook: string;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return { d, m: months[m - 1] };
};
const longDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
};
const plusDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, "").replace(/[\s,&(-]+(and)?$/, "") + "…" : s);
const refOf = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

/** The QR code as one SVG path, black on white, with the quiet zone round it. */
function Qr({ text }: { text: string }) {
  const { size, data } = useMemo(() => encode(text, { ecc: "M", border: 4 }), [text]);
  let d = "";
  data.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="block h-full w-full" shapeRendering="crispEdges" role="img" aria-label={`QR code to ${text}`}>
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

/** A deadline has to be this many days away to go on a sheet that hangs for weeks. */
const AHEAD = 5;
const ROWS = 5;
const NAMES = 7;

const ink = "text-[#1f2421]";
const label = "font-sans text-[2cqw] font-semibold tracking-[0.08em] uppercase";

export default function Poster({ list, updated }: { list: PosterData[]; updated: string }) {
  const [code, setCode] = useState(list[0]?.code ?? "NL");
  const [name, setName] = useState("");
  const [today, setToday] = useState("");
  // rows that fit: one less each time the sheet runs over, from the start for every country
  const [fit, setFit] = useState({ code: "", rows: ROWS });
  const sheet = useRef<HTMLElement>(null);

  // the link can carry both: /poster/?country=germany&ref=flesch
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const c = q.get("country")?.toLowerCase();
    const hit = list.find((x) => x.code.toLowerCase() === c || refOf(x.name) === c);
    if (hit) setCode(hit.code);
    if (q.get("ref")) setName(q.get("ref")!);
    setToday(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date()));
  }, [list]);

  const p = list.find((x) => x.code === code) ?? list[0];
  const ref = refOf(name) || "poster";
  const target = `https://internradar.eu${p.path}${p.path.includes("?") ? "&" : "?"}ref=${ref}`;

  useEffect(() => {
    const q = new URLSearchParams();
    if (code !== list[0]?.code) q.set("country", refOf(p.name));
    if (refOf(name)) q.set("ref", refOf(name));
    history.replaceState(null, "", `${location.pathname}${q.size ? `?${q}` : ""}`);
  }, [code, name, p.name, list]);

  // only deadlines far enough away; the biggest one gets the box, the next ones the list
  const from = plusDays(today || updated, AHEAD);
  const dated = p.rows.filter((r) => r.closes >= from);
  const top = [...dated].sort((a, b) => b.n - a.n || a.closes.localeCompare(b.closes))[0];
  const more = dated.filter((r) => r !== top);
  const maxRows = fit.code === code ? fit.rows : ROWS;
  // few deadlines left: the newest open roles fill the list, marked Open
  const filled = more.length < 3 ? p.fill.filter((f) => f.company !== top?.company && !more.some((r) => r.company === f.company)) : [];
  const rows = [...more, ...filled].slice(0, maxRows);
  const listHead = rows.every((r) => r.closes) ? "More deadlines" : rows.some((r) => r.closes) ? "More to apply for" : "Newest roles";
  const where = /^(Netherlands|United )/.test(p.name) ? `the ${p.name}` : p.name;
  const shownNames = p.names.slice(0, NAMES);
  const others = p.names.length - shownNames.length;

  useLayoutEffect(() => {
    const el = sheet.current;
    if (el && el.scrollHeight > el.clientHeight + 1 && maxRows > 0) setFit({ code, rows: maxRows - 1 });
  }, [code, maxRows, today, rows.length]);

  const field = "min-h-11 w-full border border-line bg-surface px-3 text-[16px] text-ink focus:border-ink focus:outline-none";
  return (
    <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-10">
      <div className="print:hidden">
        <p className="text-[14px] font-bold text-accent">Poster</p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[36px]">The deadlines on one page</h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-muted">
          For a notice board, a newsletter or a group chat. Print it, or pick &ldquo;Save as PDF&rdquo; in the print window and send the file.
        </p>
        <label htmlFor="poster-country" className="mt-5 block text-[14px] font-semibold">
          Country
        </label>
        <select id="poster-country" value={code} onChange={(e) => setCode(e.target.value)} className={`${field} mt-1`}>
          {list.map((x) => (
            <option key={x.code} value={x.code}>
              {x.name} ({x.open} open)
            </option>
          ))}
        </select>
        <label htmlFor="poster-ref" className="mt-4 block text-[14px] font-semibold">
          Your association or channel <span className="font-normal text-dim">(optional)</span>
        </label>
        <input
          id="poster-ref"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. De Leidsche Flesch"
          autoComplete="off"
          className={`${field} mt-1`}
          aria-describedby="poster-ref-help"
        />
        <p id="poster-ref-help" className="mt-1.5 text-[13px] leading-normal text-dim">
          Goes in the QR code as ?ref={ref}, so internradar can count the visits that came from your poster. No names or emails.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          data-track="poster-print"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center bg-ink px-5 text-[16px] font-semibold text-bg hover:opacity-90"
        >
          Print or save as PDF
        </button>
        <p className="mt-2 text-[13px] leading-normal text-dim">
          A4, one page. Deadlines less than {AHEAD} days away are left off, since a poster hangs for weeks. Turn off headers and footers in the print
          window if your browser adds them.
        </p>
      </div>

      <div className="mt-8 lg:mt-0 print:mt-0">
        <div className="poster-sheet mx-auto w-full max-w-[794px] [container-type:inline-size] shadow-[0_1px_8px_rgba(0,0,0,0.18)] print:max-w-none print:shadow-none">
          <article
            ref={sheet}
            className={`flex aspect-[210/297] w-full flex-col overflow-hidden bg-white px-[7cqw] pt-[5.5cqw] pb-[5.5cqw] font-serif ${ink} print:aspect-auto print:h-[296mm]`}
            aria-label={`Poster: tech internships in ${where}`}
          >
            <header className="border-b-[0.6cqw] border-[#1f2421] pb-[1.4cqw]">
              <span className="font-display text-[4.6cqw] leading-none font-bold">internradar</span>
            </header>

            {/* the line you read from across the room */}
            <div className="mt-[3.4cqw] flex items-center gap-[3.5cqw]">
              <span className="font-display text-[18cqw] leading-[0.8] font-bold tracking-[-0.03em] text-[#0f5a46]">{p.open}</span>
              <span className="font-display text-[4.5cqw] leading-[1.12] font-bold">
                tech internships and graduate roles open in {where}
              </span>
            </div>
            <p className="mt-[2.6cqw] text-[2.7cqw] leading-[1.4]">
              At{" "}
              <span className="font-bold">
                {others > 0 || shownNames.length < 2 ? shownNames.join(", ") : `${shownNames.slice(0, -1).join(", ")} and ${shownNames.at(-1)}`}
              </span>
              {others > 0 ? ` and ${others} more ${others === 1 ? "company" : "companies"}.` : "."}
            </p>

            {top && (
              <div className="mt-[3cqw] border-l-[1.4cqw] border-[#a3421a] bg-[#f8ece4] px-[3cqw] py-[2cqw] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                <p className={`${label} text-[#a3421a]`}>Closes {longDay(top.closes).replace(/ \d{4}$/, "")}</p>
                <p className="mt-[0.6cqw] font-display text-[4.6cqw] leading-[1.15] font-bold">
                  {top.company}: {cut(top.what, 56)}
                </p>
                <p className="mt-[0.4cqw] font-sans text-[2.1cqw] text-[#4b5048]">{top.city}</p>
              </div>
            )}

            {rows.length > 0 && (
              <>
                <h2 className={`${label} mt-[3cqw] text-[#0f5a46]`}>{listHead}</h2>
                <ol className="mt-[0.6cqw]">
                  {rows.map((r) => {
                    const { d, m } = r.closes ? day(r.closes) : { d: "Open", m: "" };
                    return (
                      <li key={r.key} className="flex items-baseline gap-[3cqw] border-t-[0.2cqw] border-[#d9d1c1] py-[1.1cqw] first:border-t-0">
                        <span
                          className={`w-[12cqw] shrink-0 font-display text-[3.2cqw] leading-none font-bold whitespace-nowrap ${r.closes ? "text-[#a3421a]" : "text-[#2b6a2b]"}`}
                        >
                          {d} <span className="text-[2.5cqw]">{m}</span>
                        </span>
                        <span className="min-w-0 text-[2.6cqw] leading-[1.3]">
                          <span className="font-display font-bold">{r.company}</span> {cut(r.what, 80)}
                          <span className="font-sans text-[1.85cqw] whitespace-nowrap text-[#5d6258]"> · {r.city}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {p.soon.length > 0 && (
              <p className="mt-[2.4cqw] text-[2.3cqw] leading-[1.45]">
                <span className={`${label} mr-[1cqw] text-[#0f5a46]`}>Opening soon</span>
                {p.soon.slice(0, 2).map((s, i) => (
                  <span key={s.company}>
                    {i > 0 && <span className="text-[#5d6258]"> · </span>}
                    <span className="font-bold">{s.company}</span> {s.opens}
                  </span>
                ))}
              </p>
            )}

            <footer className="mt-auto flex items-center gap-[4cqw] bg-[#0f5a46] p-[2.6cqw] text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
              <div className="h-[25cqw] w-[25cqw] shrink-0">
                <Qr text={target} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[5.2cqw] leading-[1.05] font-bold whitespace-nowrap">Scan for all {p.open}</p>
                <p className="mt-[0.8cqw] text-[2.4cqw] leading-[1.35]">Each with the interview steps and what the company says about applying again.</p>
                <p className="mt-[1.2cqw] font-display text-[3.6cqw] leading-none font-bold">{p.shown}</p>
                {/* a sheet hangs for weeks: the numbers say when they were counted, the QR code is always current */}
                <p className="mt-[0.6cqw] font-sans text-[1.7cqw] opacity-75">Numbers from {longDay(updated)}</p>
                {p.hook && <p className="mt-[1.2cqw] text-[2cqw] leading-[1.4] italic opacity-90">{p.hook}</p>}
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
