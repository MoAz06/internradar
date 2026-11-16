const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-16" -> "16 Nov" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]}`;
}

/** "2026-11-16" -> "16 Nov 2026" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}
