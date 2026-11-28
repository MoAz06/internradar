import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import JsonLd from "@/components/JsonLd";
import { roleHref } from "@/lib/items";
import { cityPages, fieldPages, fieldTitle } from "@/lib/landing";
import { og } from "@/lib/og";
import { breadcrumbs, itemList } from "@/lib/schema";

export const dynamicParams = false;

export function generateStaticParams() {
  return fieldPages().map((p) => ({ field: p.slug }));
}

const describe = (name: string, n: number, m: number) =>
  `${n} ${name.toLowerCase()} internships and graduate roles in Europe that are open or open soon, at ${m} ${m === 1 ? "company" : "companies"}, each with the hiring process.`;

export async function generateMetadata({ params }: { params: Promise<{ field: string }> }): Promise<Metadata> {
  const { field } = await params;
  const p = fieldPages().find((x) => x.slug === field);
  if (!p) return {};
  const title = `${fieldTitle[p.field]} internships in Europe`;
  return { title, description: describe(fieldTitle[p.field], p.items.length, p.companies), ...og(title, describe(fieldTitle[p.field], p.items.length, p.companies), "companies", `/fields/${p.slug}/`) };
}

export default async function FieldPage({ params }: { params: Promise<{ field: string }> }) {
  const { field } = await params;
  const p = fieldPages().find((x) => x.slug === field);
  if (!p) notFound();
  const open = p.items.filter((x) => x.status !== "soon");
  const soon = p.items.filter((x) => x.status === "soon");
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd
        data={breadcrumbs([
          { name: "internradar", path: "/" },
          { name: fieldTitle[p.field], path: `/fields/${p.slug}/` },
        ])}
      />
      <JsonLd data={itemList(`${fieldTitle[p.field]} internships and graduate roles in Europe`, open.map((x) => roleHref(x.key)))} />
      <p className="text-[14px] font-bold text-accent">Europe</p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">{fieldTitle[p.field]} internships and graduate roles</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {describe(fieldTitle[p.field], p.items.length, p.companies)} Deadlines first. To narrow it down by country or kind of
        role, use the{" "}
        <Link href={`/?field=${p.slug}`} className="link">
          search on the front page
        </Link>
        .
      </p>
      <div className="mt-7 grid grid-cols-1 gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-7">
          <h2 className="text-[20px] font-bold">Open now ({open.length})</h2>
          <RoleList list={open} empty="Nothing open in this field right now." />
        </div>
        <div className="lg:pl-7">
          <h2 className="text-[20px] font-bold">Opening soon ({soon.length})</h2>
          <RoleList list={soon} empty="No role in this field is marked as opening soon." />
          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">Other fields</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
            {fieldPages()
              .filter((x) => x.slug !== p.slug)
              .map((x) => (
                <Link key={x.slug} href={`/fields/${x.slug}/`} className="link inline-flex min-h-11 items-center">
                  {fieldTitle[x.field]}
                </Link>
              ))}
          </p>
          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">By city</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
            {cityPages().map((x) => (
              <Link key={x.slug} href={`/cities/${x.slug}/`} className="link inline-flex min-h-11 items-center">
                {x.city}
              </Link>
            ))}
          </p>
        </div>
      </div>
    </Section>
  );
}
