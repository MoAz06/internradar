import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import JsonLd from "@/components/JsonLd";
import { roleHref } from "@/lib/items";
import { allPlacePages, fieldTitle, inCountry, lowerField, titleName, whatTitle, whatWords, type PlacePage } from "@/lib/landing";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { breadcrumbs, itemList } from "@/lib/schema";
import { summerYear } from "@/lib/seasons";

// One field, or the graduate roles, in one place: "Software engineering internships in London", "Tech graduate
// jobs in the United Kingdom". The page behind the routes under /countries/, /nl/ and /cities/, built like the
// field page, with the place's other pages beside it.

/** "the United Kingdom" in a sentence, "London" as it is. */
const inPlace = (p: PlacePage) => (p.kind === "country" ? inCountry(p.placeName) : p.placeName);
/** "the UK" in a title, the way people type it. */
const titlePlace = (p: PlacePage) => (p.kind === "country" && p.code ? titleName({ code: p.code, name: p.placeName }) : p.placeName);

const describe = (p: PlacePage, year: number) =>
  p.what === "Graduate"
    ? `${p.items.length} tech graduate schemes and graduate jobs in ${inPlace(p)} for ${year}, open or opening soon, at ${p.companies} ${p.companies === 1 ? "company" : "companies"}, each with the deadline and the hiring process.`
    : `${p.items.length} ${lowerField(p.what)} internships and graduate roles in ${inPlace(p)} for summer ${year}, open or open soon, at ${p.companies} ${p.companies === 1 ? "company" : "companies"}, each with the deadline and the hiring process.`;

const heading = (p: PlacePage) =>
  p.what === "Graduate" ? `Graduate schemes and graduate jobs in tech in ${inPlace(p)}` : `${fieldTitle[p.what]} internships and graduate roles in ${inPlace(p)}`;

export function fieldPlaceMetadata(p: PlacePage): Metadata {
  const year = summerYear(today());
  const title = `${whatTitle(p)} in ${titlePlace(p)} ${year}`;
  const d = describe(p, year);
  return { title, description: d, alternates: { canonical: p.path }, ...og(title, d, "companies", p.path) };
}

export default function FieldPlace({ p }: { p: PlacePage }) {
  const year = summerYear(today());
  const open = p.items.filter((x) => x.status !== "soon");
  const soon = p.items.filter((x) => x.status === "soon");
  const siblings = allPlacePages().filter((o) => o.kind === p.kind && o.place === p.place && o.what !== p.what);
  const label = (o: PlacePage) => (o.what === "Graduate" ? "Graduate jobs" : fieldTitle[o.what]);
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd
        data={breadcrumbs([
          { name: "internradar", path: "/" },
          { name: p.placeName, path: p.placeHref },
          { name: label(p), path: p.path },
        ])}
      />
      <JsonLd data={itemList(heading(p), open.map((x) => roleHref(x.key)))} />
      <p className="text-[14px] font-bold text-accent">
        <Link href={p.placeHref} className="hover:underline">
          {p.placeName}
        </Link>
      </p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">{heading(p)}</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {describe(p, year)} Deadlines first. The company pages have the interview steps and the re-apply rule.
      </p>
      <div className="mt-7 grid grid-cols-1 gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-7">
          <h2 className="text-[20px] font-bold">Open now ({open.length})</h2>
          <RoleList list={open} empty={`Nothing open for ${whatWords(p)} in ${inPlace(p)} right now.`} />
        </div>
        <div className="lg:pl-7">
          <h2 className="text-[20px] font-bold">Opening soon ({soon.length})</h2>
          <RoleList list={soon} empty="No role here is marked as opening soon." />
          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">Also in {inPlace(p)}</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
            {siblings.map((o) => (
              <Link key={o.path} href={o.path} className="link inline-flex min-h-11 items-center">
                {label(o)}
              </Link>
            ))}
            <Link href={p.placeHref} className="link inline-flex min-h-11 items-center">
              Every role in {inPlace(p)}
            </Link>
          </p>
          {p.what !== "Graduate" && (
            <>
              <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">{fieldTitle[p.what]} elsewhere</h2>
              <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
                <Link href={`/fields/${p.whatSlug}/`} className="link inline-flex min-h-11 items-center">
                  All of Europe
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
