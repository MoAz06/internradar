import Link from "next/link";
import Section from "@/components/Section";

export default function NotFound() {
  return (
    <Section className="py-24">
      <p className="mono text-xs tracking-[0.08em] text-signal">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Not on the radar.</h1>
      <p className="mt-2 text-sm text-muted">That page does not exist.</p>
      <Link href="/" className="mt-5 inline-block text-sm text-signal hover:underline">
        Back to the list
      </Link>
    </Section>
  );
}
