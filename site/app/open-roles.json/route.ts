import { buildItems } from "@/lib/buildItems";
import { today } from "@/lib/live";
import { openRoles } from "@/lib/openRoles";

export const dynamic = "force-static";

/** Every role that isn't closed, as plain data: for people and tools that want the list without the site.
 * /roles.json is the home page's own copy and can change shape any time; this one keeps its field names. */
export function GET() {
  const now = today();
  return Response.json({ built: now, source: "https://internradar.eu", roles: openRoles(buildItems(now)) });
}
