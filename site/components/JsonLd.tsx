import { jsonLd } from "@/lib/schema";

/** One block of structured data for search engines. `data` is a schema.org object from lib/schema.ts. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
