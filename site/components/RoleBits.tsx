import Icon from "@/components/Icon";
import type { Item } from "@/lib/items";
import { toolTag } from "@/lib/tests";

/** One line under a title: a strict re-apply rule first, so it never falls off, then the test tools the company
 * names, then how they hire. `full` lets it
 * run onto more lines instead of ending in "…". */
export function HowLine({
  x,
  className = "",
  full = false,
}: {
  x: Pick<Item, "how" | "reapplyTag" | "reapplyRule"> & { tests?: string[] };
  className?: string;
  full?: boolean;
}) {
  const tag = toolTag(x.tests ?? []);
  if (!x.how && !x.reapplyTag && !tag) return null;
  return (
    <span className={`block ${full ? "" : "truncate"} font-sans text-dim ${className}`}>
      {x.reapplyTag && (
        <span className="font-semibold text-soon" title={x.reapplyRule}>
          Re-apply: {x.reapplyTag}
        </span>
      )}
      {x.reapplyTag && (tag || x.how) && " · "}
      {tag && <span className="font-semibold text-muted">{tag}</span>}
      {tag && x.how && " · "}
      {x.how}
    </span>
  );
}

/** "4 roles" or "2 cities" next to a merged row's title; the arrow turns when it is open. Without text it is the
 * arrow alone: the hint on a single role that it opens. In a `group` details element the arrow turns by itself. */
export function CountChip({ text, open = false }: { text: string; open?: boolean }) {
  const arrow = <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform group-open:rotate-180 ${open ? "rotate-180" : ""}`} />;
  if (!text) return <span className="ml-1 inline-flex align-[1px] text-dim">{arrow}</span>;
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-sm border border-line bg-surface px-1.5 align-[1px] font-sans text-[12.5px] whitespace-nowrap text-muted">
      {text}
      {arrow}
    </span>
  );
}
