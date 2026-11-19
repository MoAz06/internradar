/** Facts read from a role's own "who can apply" line, for the filters. Each one only says what the line says:
 * a role whose line names no level, no work rights or no language stays in every filter. */

export type Level = "bachelor" | "master" | "phd";
export const levels: { value: Level; label: string }[] = [
  { value: "bachelor", label: "Bachelor's" },
  { value: "master", label: "Master's" },
  { value: "phd", label: "PhD" },
];

/** The study levels the role names, or null when it names none (then it fits everyone). */
export function levelsOf(eligibility: string, title: string): Level[] | null {
  const t = `${title}; ${eligibility}`;
  if (/bachelor'?s?( degree)? or (above|higher)|any (study )?level|through to MSc and PhD|nice to have/i.test(t)) return null;
  const out = new Set<Level>();
  // "a bachelor's or graduate degree", "undergraduate and graduate programs": graduate here means master's and PhD
  if (/or graduate degree|and graduate programs/i.test(eligibility)) out.add("master").add("phd");
  if (/bachelor|\bBSc\b|\bBA\b|undergrad|\bHBO\b|Bac\+3|\bB\.?Sc|\bBS\/MS\b|\bBS\b/i.test(t)) out.add("bachelor");
  if (/master|\bMSc\b|\bM\.?Sc\b|\bM[12]\b|Bac\+[45]|Diplom|\bMS\b|BS\/MS/i.test(t)) out.add("master");
  if (/\bPhD|doctora/i.test(t)) out.add("phd");
  return out.size ? [...out] : null;
}

/** True when the role says you must already be allowed to work there, or that it doesn't sponsor visas. */
export function needsWorkRights(eligibility: string): boolean {
  return /no (visa |immigration )?sponsorship|without (visa )?sponsorship|cannot sponsor|EU national|Schengen citizens|right to work|eligible to work in|authori[sz]ed to work|work rights|valid (local |Swiss )?work permit|work authori[sz]ation in \w+ from|already based in|need a valid work and residence permit/i.test(
    eligibility,
  );
}

const tongues = ["Dutch", "German", "French", "Danish", "Portuguese", "Finnish", "Swedish", "Polish", "Italian", "Spanish", "Norwegian"];

/** Languages other than English the role asks for. A language that is only "a plus", optional or one of two choices with English doesn't count. */
export function languagesOf(eligibility: string): string[] {
  const out = new Set<string>();
  for (const part of eligibility.split(/;/)) {
    if (/a plus|helps|not required|need no|or English|English or|and\/or|universit|school|diploma|posting is in|scale/i.test(part)) continue;
    if (/Swiss national language/i.test(part)) out.add("German or French");
    const named = tongues.filter((t) => new RegExp(`\\b${t}\\b`).test(part));
    // "Dutch or French" is one requirement with a choice
    const either = named.length === 2 && new RegExp(`${named[0]} or ${named[1]}|${named[1]} or ${named[0]}`).test(part);
    if (either) out.add(named.join(" or "));
    else named.forEach((t) => out.add(t));
  }
  return [...out];
}
