// Writing into the data files (site/data/xx.ts) the way a person would: the entry as a literal in the same
// style as the rest, spliced into one company's list. Plain text, no parser, so the file keeps its layout.

/** An entry as it goes in a data file. Strings and lists of strings only, which is all reports and roles have. */
export function literal(e: Record<string, string | string[] | undefined>, pad: string): string {
  const q = (s: string) => JSON.stringify(s);
  const lines = [`${pad}{`];
  for (const [k, v] of Object.entries(e)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) lines.push(`${pad}  ${k}: [`, ...v.map((x) => `${pad}    ${q(x)},`), `${pad}  ],`);
    else lines.push(`${pad}  ${k}: ${q(String(v))},`);
  }
  lines.push(`${pad}},`);
  return lines.join("\n");
}

/** Where one company's object starts and ends in a data file, or null when the slug isn't in it. */
function companyBlock(text: string, slug: string): { at: number; end: number } | null {
  const at = text.indexOf(`slug: ${JSON.stringify(slug)},`);
  if (at < 0) return null;
  const next = text.indexOf("\n    slug: ", at + 1);
  return { at, end: next < 0 ? text.length : next };
}

/** Puts an entry at the top of one company's `list` ("reports" or "roles"). null when the slug isn't in this file. */
export function insertEntry(text: string, slug: string, list: "reports" | "roles", entry: Record<string, string | string[] | undefined>): string | null {
  const b = companyBlock(text, slug);
  if (!b) return null;
  const lit = literal(entry, "      ");
  const empty = text.indexOf(`\n    ${list}: [],`, b.at);
  const full = text.indexOf(`\n    ${list}: [\n`, b.at);
  if (empty > 0 && empty < b.end) {
    const i = empty + `\n    ${list}: [`.length;
    return `${text.slice(0, i)}\n${lit}\n    ${text.slice(i)}`;
  }
  if (full > 0 && full < b.end) {
    const i = full + `\n    ${list}: [\n`.length;
    return `${text.slice(0, i)}${lit}\n${text.slice(i)}`;
  }
  throw new Error(`No ${list} list found for ${slug}`);
}

/** Adds a page to one company's sources, at the end, unless it's there already. */
export function addSource(text: string, slug: string, url: string, checked: string): string {
  const b = companyBlock(text, slug);
  if (!b) throw new Error(`${slug} is not in this file`);
  const block = text.slice(b.at, b.end);
  if (block.includes(`url: ${JSON.stringify(url)}`)) return text;
  const line = `      { url: ${JSON.stringify(url)}, checked: ${JSON.stringify(checked)} },`;
  const empty = text.indexOf("\n    sources: [],", b.at);
  if (empty > 0 && empty < b.end) {
    const i = empty + "\n    sources: [".length;
    return `${text.slice(0, i)}\n${line}\n    ${text.slice(i)}`;
  }
  const open = text.indexOf("\n    sources: [\n", b.at);
  if (open < 0 || open > b.end) throw new Error(`No sources list found for ${slug}`);
  const close = text.indexOf("\n    ],", open);
  return `${text.slice(0, close)}\n${line}${text.slice(close)}`;
}
