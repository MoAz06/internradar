import type { Metadata } from "next";
import CountryLocal, { dutch, localMetadata } from "@/components/CountryLocal";

// The Netherlands in Dutch: /stages/, the word people type.

export function generateMetadata(): Metadata {
  return localMetadata(dutch);
}

export default function StagesPage() {
  return <CountryLocal t={dutch} />;
}
