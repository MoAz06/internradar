import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FieldPlace, { fieldPlaceMetadata } from "@/components/FieldPlace";
import { graduatePlacePages } from "@/lib/landing";

// The graduate roles in the Netherlands, under the country's short link.

export const dynamicParams = false;

type Params = Record<string, never>;

const pages = () => graduatePlacePages().filter((p) => p.kind === "country" && p.code === "NL");
const find = (_q: Params) => pages()[0];

export function generateStaticParams(): Params[] {
  return pages().map(() => ({}));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = find(await params);
  return p ? fieldPlaceMetadata(p) : {};
}

export default async function DutchGraduatePage({ params }: { params: Promise<Params> }) {
  const p = find(await params);
  if (!p) notFound();
  return <FieldPlace p={p} />;
}
