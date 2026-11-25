import { buildItems } from "@/lib/buildItems";
import { today } from "@/lib/live";
import { openRoles, toCsv } from "@/lib/openRoles";

export const dynamic = "force-static";

/** The same roles as /open-roles.json, as a spreadsheet. */
export function GET() {
  return new Response(toCsv(openRoles(buildItems(today()))), { headers: { "Content-Type": "text/csv; charset=utf-8" } });
}
