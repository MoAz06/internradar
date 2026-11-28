import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FieldPlace, { fieldPlaceMetadata } from "@/components/FieldPlace";
import { fieldPlacePages } from "@/lib/landing";

// A field in the Netherlands, "software engineering in the Netherlands", under the country's short link.

export const dynamicParams = false;

type Params = { field: string };

const pages = () => fieldPlacePages().filter((p) => p.kind === "country" && p.code === "NL");
const find = (q: Params) => pages().find((p) => p.whatSlug === q.field);

export function generateStaticParams(): Params[] {
  return pages().map((p) => ({ field: p.whatSlug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = find(await params);
  return p ? fieldPlaceMetadata(p) : {};
}

export default async function DutchFieldPage({ params }: { params: Promise<Params> }) {
  const p = find(await params);
  if (!p) notFound();
  return <FieldPlace p={p} />;
}
