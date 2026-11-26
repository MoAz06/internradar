// A role the nightly run closed because its posting was gone, back on its job board under the same link.

import { shortDate } from "./roleDraft.ts";

/** One role's block in a data file, open again: status open, its deadline when that is still ahead, checked today.
 * null when it should stay closed: a person closed it (the Applications line isn't the nightly run's), or the
 * deadline has passed. */
export function reopenBlock(block: string, day: string): string | null {
  if (!/\n        status: "closed",/.test(block) || !/\n        applications: "The posting was taken down by [^"]*",/.test(block)) return null;
  const closes = block.match(/\n        closes: "(\d{4}-\d{2}-\d{2})",/)?.[1];
  if (closes && closes < day) return null;
  const applications = closes ? `Closes ${shortDate(closes)}` : "Open, no deadline listed";
  return block
    .replace(/(\n        status: )"closed",/, '$1"open",')
    .replace(/(\n        applications: )".*",/, `$1${JSON.stringify(applications)},`)
    .replace(/(\n        checked: )"[\d-]+",/, `$1"${day}",`);
}
