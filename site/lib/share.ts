/** Where "share your process" goes: always the /share/ page, with the company picked when there is one.
 * That page shows the form, or the GitHub form until the Worker is live. */
export function shareUrl(slug?: string): string {
  return slug ? `/share/?company=${slug}#form` : "/share/#form";
}
