import { buildItems } from "@/lib/buildItems";
import { today } from "@/lib/live";

export const dynamic = "force-static";

/** Every role, for the list on the home page. The page itself only carries the first page of the list, so it
 * stays small; this file loads right after. */
export function GET() {
  const now = today();
  return Response.json({ built: now, items: buildItems(now) });
}
