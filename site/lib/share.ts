import { links } from "../data/companies.ts";

/** Where "share your process" goes: the form without an account once it exists, else the GitHub form.
 * With a company, its name is filled in already. */
export function shareUrl(company?: string): string {
  if (links.shareForm) return company ? `${links.shareForm}?company=${encodeURIComponent(company)}` : links.shareForm;
  return company ? `${links.shareProcess}&title=${encodeURIComponent(`[process] ${company}`)}` : links.shareProcess;
}
