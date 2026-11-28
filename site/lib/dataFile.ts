// Writing into the data files (site/data/xx.ts) the way a person would: the entry as a literal in the same
// style as the rest, spliced into one company's list. Plain text, no parser, so the file keeps its layout.

/** An entry as it goes in a data file: strings, lists of strings and true/false. */
export function literal(e: Record<string, string | string[] | boolean | undefined>, pad: string): string {
  const q = (s: string) => JSON.stringify(s);
  const lines = [`${pad}{`];
  for (const [k, v] of Object.entries(e)) {
    if (v === undefined) continue;
    if (typeof v === "boolean") lines.push(`${pad}  ${k}: ${v},`);
    else if (Array.isArray(v)) lines.push(`${pad}  ${k}: [`, ...v.map((x) => `${pad}    ${q(x)},`), `${pad}  ],`);
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
export function insertEntry(text: string, slug: string, list: "reports" | "roles", entry: Record<string, string | string[] | boolean | undefined>): string | null {
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

/** Where one role's object is, found by its posting link: from the line with "{" to the line with "},". */
function roleBlock(text: string, url: string): { start: number; end: number } | null {
  const at = text.indexOf(`source: ${JSON.stringify(url)},`);
  if (at < 0) return null;
  const start = text.lastIndexOf("\n      {\n", at);
  const end = text.indexOf("\n      },", at) + "\n      },".length;
  return start < 0 || end < at ? null : { start, end };
}

/** Where one role of one company is, by its posting link. Several roles can share a link (one posting for six
 * cities, or two programmes on one page), so the search stays inside the company's block, skips roles that are
 * closed already, and takes the one with `title` when a title is given. null when it isn't in this file. */
export function roleBlockOf(text: string, url: string, slug?: string, title?: string): { start: number; end: number } | null {
  const b = slug ? companyBlock(text, slug) : { at: 0, end: text.length };
  if (!b) return null;
  const needle = `source: ${JSON.stringify(url)},`;
  let from = b.at;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at < 0 || at >= b.end) return null;
    const start = text.lastIndexOf("\n      {\n", at);
    const endAt = text.indexOf("\n      },", at);
    if (start < b.at || endAt < 0) return null;
    const end = endAt + "\n      },".length;
    const block = text.slice(start, end);
    const wanted = title ? block.includes(`title: ${JSON.stringify(title)},`) : !block.includes('\n        status: "closed",');
    if (wanted) return { start, end };
    from = end;
  }
}

/** Changes one role of one company: `edit` gets the role's lines and gives them back. null when it isn't here. */
export function editRoleOf(text: string, url: string, edit: (block: string) => string, slug?: string, title?: string): string | null {
  const b = roleBlockOf(text, url, slug, title);
  if (!b) return null;
  return text.slice(0, b.start) + edit(text.slice(b.start, b.end)) + text.slice(b.end);
}

/** Takes one role out of a data file, by its posting link. null when the link isn't in this file. */
export function removeRole(text: string, url: string): string | null {
  const b = roleBlock(text, url);
  if (!b) return null;
  let out = text.slice(0, b.start) + text.slice(b.end);
  // a list that is empty now is written the short way, like the others
  out = out.replace(/\n    roles: \[\n    \],/g, "\n    roles: [],");
  return out;
}

/** Changes one role in a data file: `edit` gets the role's lines and gives them back. null when the link isn't here. */
export function editRole(text: string, url: string, edit: (block: string) => string): string | null {
  const b = roleBlock(text, url);
  if (!b) return null;
  return text.slice(0, b.start) + edit(text.slice(b.start, b.end)) + text.slice(b.end);
}

/** Adds a posting to data/skip.ts, so the nightly run never brings it back. */
export function addSkip(text: string, url: string, why: string): string {
  if (text.includes(`url: ${JSON.stringify(url)}`)) return text;
  const end = text.lastIndexOf("];");
  return `${text.slice(0, end)}  { url: ${JSON.stringify(url)}, why: ${JSON.stringify(why)} },\n${text.slice(end)}`;
}
