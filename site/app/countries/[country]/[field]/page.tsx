import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FieldPlace, { fieldPlaceMetadata } from "@/components/FieldPlace";
import { fieldPlacePages } from "@/lib/landing";

// A field in a country, "software engineering in the United Kingdom". The Netherlands has these under /nl/.

export const dynamicParams = false;

type Params = { country: string; field: string };

const pages = () => fieldPlacePages().filter((p) => p.kind === "country" && p.code !== "NL");
const find = (q: Params) => pages().find((p) => p.place === q.country && p.fieldSlug === q.field);

export function generateStaticParams(): Params[] {
  return pages().map((p) => ({ country: p.place, field: p.fieldSlug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = find(await params);
  return p ? fieldPlaceMetadata(p) : {};
}

export default async function CountryFieldPage({ params }: { params: Promise<Params> }) {
  const p = find(await params);
  if (!p) notFound();
  return <FieldPlace p={p} />;
}
