import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FieldPlace, { fieldPlaceMetadata } from "@/components/FieldPlace";
import { graduatePlacePages } from "@/lib/landing";

// The graduate roles in a city, "graduate jobs in London".

export const dynamicParams = false;

type Params = { city: string };

const pages = () => graduatePlacePages().filter((p) => p.kind === "city");
const find = (q: Params) => pages().find((p) => p.place === q.city);

export function generateStaticParams(): Params[] {
  return pages().map((p) => ({ city: p.place }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = find(await params);
  return p ? fieldPlaceMetadata(p) : {};
}

export default async function CityGraduatePage({ params }: { params: Promise<Params> }) {
  const p = find(await params);
  if (!p) notFound();
  return <FieldPlace p={p} />;
}
