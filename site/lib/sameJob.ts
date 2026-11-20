// One job, posted twice. Some SmartRecruiters companies post a job once in English and once in the local language,
// as two postings with two links but one reference number (Bosch did, in Nov 2026). The nightly runs use this to
// skip the second posting: a role on the list with the same number, or one already taken this run, is the same job.

import type { Company } from "../data/types.ts";
import type { Found } from "./boards.ts";

/** The company board and posting id of a SmartRecruiters link, or null for any other link. */
export function srLink(url: string): { board: string; id: string } | null {
  const m = url.match(/^https:\/\/(?:jobs|careers)\.smartrecruiters\.com\/([^/?#]+)\/(\d+)/);
  return m ? { board: m[1], id: m[2] } : null;
}

type RefOf = (board: string, id: string) => Promise<string>;

/**
 * What a nightly run knows about reference numbers. `refOf` reads a posting's number ("" when it has none);
 * the roles on the list are only read for a board once a posting from that board comes up.
 */
export function jobRefs(all: Company[], refOf: RefOf) {
  const listed = new Map<string, Promise<Set<string>>>();
  const onList = (board: string) => {
    const k = board.toLowerCase();
    if (!listed.has(k)) {
      const links = all.flatMap((c) => c.roles.map((r) => srLink(r.source))).filter((l) => l && l.board.toLowerCase() === k) as { board: string; id: string }[];
      listed.set(k, Promise.all(links.map((l) => refOf(l.board, l.id).catch(() => ""))).then((refs) => new Set(refs.filter(Boolean))));
    }
    return listed.get(k)!;
  };
  return {
    /** The job's key, board plus reference number, or "" when the posting isn't on SmartRecruiters or has no number. */
    async key(f: Found): Promise<string> {
      if (f.spec.ats !== "smartrecruiters") return "";
      const ref = await refOf(f.spec.board, f.ref).catch(() => "");
      return ref ? `${f.spec.board.toLowerCase()}#${ref}` : "";
    },
    /** Whether a role on the list has the same key. */
    async listed(key: string): Promise<boolean> {
      if (!key) return false;
      const [board, ref] = key.split("#");
      return (await onList(board)).has(ref);
    },
  };
}
