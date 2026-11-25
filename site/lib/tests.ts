/** The online test and interview tools a company names in its own hiring steps. Only names that appear in the text
 * count: a role with none named may still have a test, so the site says "no tool named", never "no test". */

export const testTools: { name: string; what: string; re: RegExp }[] = [
  { name: "HackerRank", what: "coding test", re: /\bhacker ?rank\b/i },
  { name: "CodeSignal", what: "coding test", re: /\bcode ?signal\b/i },
  { name: "Codility", what: "coding test", re: /\bcodility\b/i },
  { name: "HackerEarth", what: "coding test", re: /\bhacker ?earth\b/i },
  { name: "CodinGame", what: "coding test", re: /\bcodin ?game\b/i },
  { name: "Coderbyte", what: "coding test", re: /\bcoderbyte\b/i },
  { name: "DevSkiller", what: "coding test", re: /\bdevskiller\b/i },
  { name: "TestDome", what: "coding test", re: /\btestdome\b/i },
  { name: "CoderPad", what: "live coding", re: /\bcoder ?pad\b/i },
  { name: "Karat", what: "coding interview", re: /\bkarat\b/i },
  { name: "HireVue", what: "video interview", re: /\bhire ?vue\b/i },
  { name: "SHL", what: "online test", re: /\bSHL\b/ },
  { name: "Mettl", what: "online test", re: /\bmettl\b/i },
  { name: "TestGorilla", what: "online test", re: /\btest ?gorilla\b/i },
  { name: "Pymetrics", what: "online games", re: /\bpymetrics\b/i },
  { name: "Arctic Shores", what: "online games", re: /\barctic shores\b/i },
  { name: "Cappfinity", what: "online test", re: /\bcappfinity\b/i },
  { name: "Sova", what: "online test", re: /\bsova (assessment|platform|test)/i },
  { name: "Talogy", what: "online test", re: /\btalogy\b/i },
  { name: "Saville", what: "online test", re: /\bsaville\b/i },
  { name: "Criteria", what: "online test", re: /\bcriteria corp|\bCriteria Cognitive|\bCCAT\b/i },
  { name: "cut-e", what: "online test", re: /\bcut-e\b/i },
  { name: "Thomas International", what: "online test", re: /\bthomas international\b/i },
  { name: "Alva Labs", what: "online test", re: /\balva labs\b/i },
  { name: "Harver", what: "online test", re: /\bharver\b/i },
];

/** The tools named in these lines, in the order of the list above. */
export function testsOf(lines: string[]): string[] {
  const text = lines.join(" ");
  return testTools.filter((t) => t.re.test(text)).map((t) => t.name);
}

/** "HackerRank coding test", for the role's details. */
export const toolWords = (name: string) => `${name} ${testTools.find((t) => t.name === name)?.what ?? "test"}`;

/** For the URL: ?test=hackerrank, ?test=none. */
export const toolSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** The tools in two or three words for a row: "Test: HackerRank", "Video: HireVue", or both. */
export function toolTag(names: string[]): string {
  const video = names.filter((n) => testTools.find((t) => t.name === n)?.what === "video interview");
  const test = names.filter((n) => !video.includes(n));
  return [test.length ? `Test: ${test.join(", ")}` : "", video.length ? `Video: ${video.join(", ")}` : ""].filter(Boolean).join(" · ");
}
