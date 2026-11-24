/** Where "share your process" goes: always the /share/ page, with the company picked when there is one.
 * `end` picks "how far did you get" in the quick form (an id from quickEnds in lib/reportForm.ts).
 * That page shows the form, or the GitHub form until the Worker is live. */
export function shareUrl(slug?: string, role?: string, end?: string): string {
  if (!slug) return "/share/#form";
  return `/share/?company=${slug}${role ? `&role=${encodeURIComponent(role)}` : ""}${end ? `&end=${end}` : ""}#form`;
}
