import { companies } from "../data/companies.ts";
import type { Company, Role } from "../data/types.ts";
import { buildItems } from "./buildItems.ts";
import type { Item } from "./items.ts";
import { today } from "./live.ts";

export type RolePage = { item: Item; role: Role; company: Company };

/** One page per role, at /roles/<key>/. The key is the short code that saved-list links already use. */
let cache: { now: string; pages: RolePage[] } | null = null;

export function rolePages(now = today()): RolePage[] {
  if (cache?.now === now) return cache.pages;
  const byId = new Map(buildItems(now).map((x) => [x.id, x]));
  const out: RolePage[] = [];
  const seen = new Set<string>();
  for (const company of companies) {
    for (const role of company.roles) {
      // the same id rule as buildItems, so a page and a list row are the same role
      let id = `${company.slug}|${role.title}|${role.source}`;
      while (seen.has(id)) id += "+";
      seen.add(id);
      const item = byId.get(id);
      if (item) out.push({ item, role, company });
    }
  }
  const keys = new Set(out.map((p) => p.item.key));
  if (keys.size !== out.length) throw new Error("Two roles share a short key; the role pages would collide.");
  cache = { now, pages: out };
  return out;
}
