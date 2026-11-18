/** Splits an issue body into its "### Heading" sections: lower-case heading to trimmed value.
 * "_No response_" (what a GitHub issue form writes for an empty field) counts as empty. */
export function sections(body: string): Map<string, string> {
  const parts = new Map<string, string>();
  for (const chunk of body.replace(/\r\n?/g, "\n").split(/^### /m).slice(1)) {
    const nl = chunk.indexOf("\n");
    const head = (nl < 0 ? chunk : chunk.slice(0, nl)).trim().toLowerCase();
    const value = (nl < 0 ? "" : chunk.slice(nl + 1)).trim();
    parts.set(head, value === "_No response_" ? "" : value);
  }
  return parts;
}
