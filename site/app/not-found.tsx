import Link from "next/link";
import Section from "@/components/Section";

export default function NotFound() {
  return (
    <Section className="py-24">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">This page doesn&apos;t exist, or it moved.</p>
      <Link href="/" className="link mt-5 inline-block text-sm">
        Back to the list
      </Link>
    </Section>
  );
}
