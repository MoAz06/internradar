import { buildItems } from "@/lib/buildItems";
import { roleHref } from "@/lib/items";
import { countryPages, inCountry } from "@/lib/landing";
import { today } from "@/lib/live";

export const dynamic = "force-static";

const site = "https://internradar.eu";

/** Every open role in one plain-text file, by country and company, for language models and the tools that
 * read them: one fetch instead of nine hundred pages. The short version with the links is /llms.txt. */
export function GET() {
  const now = today();
  const items = buildItems(now).filter((x) => x.status !== "closed");
  const lines: string[] = [
    "# internradar: every open tech internship and graduate role in Europe",
    "",
    `> ${items.length} roles open or opening soon at ${new Set(items.map((x) => x.slug)).size} companies, as of ${now}. Each line: title | city | when it closes | kind, field | pay the company states | how the company hires. Then the posting and the role's page on internradar. Every fact comes from the company's own pages; where a company doesn't say something, it isn't here.`,
    "",
  ];
  for (const k of countryPages()) {
    lines.push(`## ${inCountry(k.name).replace(/^the /, "The ")} (${k.items.length})`, "");
    const byCompany = new Map<string, typeof items>();
    for (const x of k.items) byCompany.set(x.company, [...(byCompany.get(x.company) ?? []), x]);
    for (const [company, roles] of [...byCompany].sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`### ${company}`);
      for (const x of roles) {
        const when = x.closes ? `${x.when}, last day ${x.closes}` : x.when;
        const pay = x.pay ? ` | ${x.pay.label}` : "";
        lines.push(`- ${x.title} | ${x.city} | ${when} | ${x.kind}, ${x.field}${pay} | ${x.how}`);
        lines.push(`  posting: ${x.source}`);
        lines.push(`  page: ${site}${roleHref(x.key)}`);
      }
      lines.push("");
    }
  }
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
