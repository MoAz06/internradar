/** Where "share your process" goes: always the /share/ page, with the company picked when there is one.
 * That page shows the form, or the GitHub form until the Worker is live. */
export function shareUrl(slug?: string, role?: string): string {
  if (!slug) return "/share/#form";
  return `/share/?company=${slug}${role ? `&role=${encodeURIComponent(role)}` : ""}#form`;
}
