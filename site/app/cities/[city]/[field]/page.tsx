import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FieldPlace, { fieldPlaceMetadata } from "@/components/FieldPlace";
import { fieldPlacePages } from "@/lib/landing";

// A field in a city, "software engineering in London".

export const dynamicParams = false;

type Params = { city: string; field: string };

const pages = () => fieldPlacePages().filter((p) => p.kind === "city");
const find = (q: Params) => pages().find((p) => p.place === q.city && p.whatSlug === q.field);

export function generateStaticParams(): Params[] {
  return pages().map((p) => ({ city: p.place, field: p.whatSlug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = find(await params);
  return p ? fieldPlaceMetadata(p) : {};
}

export default async function CityFieldPage({ params }: { params: Promise<Params> }) {
  const p = find(await params);
  if (!p) notFound();
  return <FieldPlace p={p} />;
}
