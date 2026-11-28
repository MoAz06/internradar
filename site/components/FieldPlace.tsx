import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import JsonLd from "@/components/JsonLd";
import { roleHref } from "@/lib/items";
import { fieldPlacePages, fieldTitle, inCountry, lowerField, titleName, type FieldPlacePage } from "@/lib/landing";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { breadcrumbs, itemList } from "@/lib/schema";
import { summerYear } from "@/lib/seasons";

// One field in one place, "Software engineering internships in London": the page behind the routes under
// /countries/, /nl/ and /cities/. Built like the field page, with the place's other fields beside it.

/** "the United Kingdom" in a sentence, "London" as it is. */
const inPlace = (p: FieldPlacePage) => (p.kind === "country" ? inCountry(p.placeName) : p.placeName);
/** "the UK" in a title, the way people type it. */
const titlePlace = (p: FieldPlacePage) => (p.kind === "country" && p.code ? titleName({ code: p.code, name: p.placeName }) : p.placeName);

const describe = (p: FieldPlacePage, year: number) =>
  `${p.items.length} ${lowerField(p.field)} internships and graduate roles in ${inPlace(p)} for summer ${year}, open or open soon, at ${p.companies} ${p.companies === 1 ? "company" : "companies"}, each with the deadline and the hiring process.`;

export function fieldPlaceMetadata(p: FieldPlacePage): Metadata {
  const year = summerYear(today());
  const title = `${fieldTitle[p.field]} internships in ${titlePlace(p)} ${year}`;
  const d = describe(p, year);
  return { title, description: d, alternates: { canonical: p.path }, ...og(title, d, "companies", p.path) };
}

export default function FieldPlace({ p }: { p: FieldPlacePage }) {
  const year = summerYear(today());
  const open = p.items.filter((x) => x.status !== "soon");
  const soon = p.items.filter((x) => x.status === "soon");
  const siblings = fieldPlacePages().filter((o) => o.kind === p.kind && o.place === p.place && o.field !== p.field);
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd
        data={breadcrumbs([
          { name: "internradar", path: "/" },
          { name: p.placeName, path: p.placeHref },
          { name: fieldTitle[p.field], path: p.path },
        ])}
      />
      <JsonLd data={itemList(`${fieldTitle[p.field]} internships and graduate roles in ${inPlace(p)}`, open.map((x) => roleHref(x.key)))} />
      <p className="text-[14px] font-bold text-accent">
        <Link href={p.placeHref} className="hover:underline">
          {p.placeName}
        </Link>
      </p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">
        {fieldTitle[p.field]} internships and graduate roles in {inPlace(p)}
      </h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {describe(p, year)} Deadlines first. The company pages have the interview steps and the re-apply rule.
      </p>
      <div className="mt-7 grid grid-cols-1 gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-7">
          <h2 className="text-[20px] font-bold">Open now ({open.length})</h2>
          <RoleList list={open} empty={`Nothing open in ${inPlace(p)} in this field right now.`} />
        </div>
        <div className="lg:pl-7">
          <h2 className="text-[20px] font-bold">Opening soon ({soon.length})</h2>
          <RoleList list={soon} empty="No role here is marked as opening soon." />
          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">Also in {p.placeName}</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
            {siblings.map((o) => (
              <Link key={o.path} href={o.path} className="link inline-flex min-h-11 items-center">
                {fieldTitle[o.field]}
              </Link>
            ))}
            <Link href={p.placeHref} className="link inline-flex min-h-11 items-center">
              Every role in {p.placeName}
            </Link>
          </p>
          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">{fieldTitle[p.field]} elsewhere</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
            <Link href={`/fields/${p.fieldSlug}/`} className="link inline-flex min-h-11 items-center">
              All of Europe
            </Link>
          </p>
        </div>
      </div>
    </Section>
  );
}
