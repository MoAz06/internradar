import type { Metadata } from "next";
import CountryLocal, { german, localMetadata } from "@/components/CountryLocal";

// Germany in German: /praktika/, the word people type.

export function generateMetadata(): Metadata {
  return localMetadata(german);
}

export default function PraktikaPage() {
  return <CountryLocal t={german} />;
}
