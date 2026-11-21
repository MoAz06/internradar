import Icon from "@/components/Icon";
import type { Item } from "@/lib/items";

/** One line under a title: a strict re-apply rule first, so it never falls off, then how they hire. `full` lets it
 * run onto more lines instead of ending in "…". */
export function HowLine({
  x,
  className = "",
  full = false,
}: {
  x: Pick<Item, "how" | "reapplyTag" | "reapplyRule">;
  className?: string;
  full?: boolean;
}) {
  if (!x.how && !x.reapplyTag) return null;
  return (
    <span className={`block ${full ? "" : "truncate"} font-sans text-dim ${className}`}>
      {x.reapplyTag && (
        <span className="font-semibold text-soon" title={x.reapplyRule}>
          Re-apply: {x.reapplyTag}
        </span>
      )}
      {x.reapplyTag && x.how && " · "}
      {x.how}
    </span>
  );
}

/** "4 roles" or "2 cities" next to a merged row's title; the arrow turns when it is open. */
export function CountChip({ text, open = false }: { text: string; open?: boolean }) {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-sm border border-line bg-surface px-1.5 align-[1px] font-sans text-[12.5px] whitespace-nowrap text-muted">
      {text}
      <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
    </span>
  );
}
