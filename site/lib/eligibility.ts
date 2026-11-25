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

/** A company line (pay or notes) that says, for all its early careers roles, that it doesn't sponsor visas.
 * Lines about one posting, one programme or one city ("the PhD intern posting says", "Visa (Engineering Graduate):")
 * don't count, nor lines that leave room ("may be", "case-by-case", "for some roles"). A line that names only
 * interns, or only graduates, counts for that kind of role. */
export function companyNoSponsor(lines: string[], kind: string): boolean {
  return lines.some((line) => {
    if (!/\b(does not|doesn't|do not|don't|cannot|can't|unable to|not able to|will not)\b[^.“”]{0,40}\bsponsor|\bsponsorship (or support )?(is )?(not available|unavailable|not offered)|\bno (visa |immigration )?sponsorship\b(?! statement)|\bdoes not qualify for [\w ]*sponsorship/i.test(line)) return false;
    if (/not stated|not mentioned|does not say|doesn't say|may be|case-by-case|some roles|depends on|will consider|will accept|\bwe sponsor|\bdo sponsor|\bcan sponsor|\bcan provide|\bis available|\bare available|form asks/i.test(line)) return false;
    // one posting, programme or city: "the Galway graduate role", "the PhD intern posting", "Visa (Engineering Graduate):", "Visa for the London software internship:"
    if (/\bthe (?!posting\b|whole\b)(?:(?!the\b)[\w'-]+ ){0,7}(postings?|roles?|programmes?|internships?|tracks?)\b|^Visa \(|^Visa for |\bbut not for\b/i.test(line)) return false;
    return fitsKind(line, kind);
  });
}

/** A company line that names only interns counts for internships, one that names only graduates for graduate roles.
 * "international" is not about interns. */
function fitsKind(line: string, kind: string): boolean {
  const interns = /\bintern(s|ships?)?\b/i.test(line);
  const grads = /\b(graduat|new grads?\b)/i.test(line);
  if (interns && !grads) return kind === "Internship";
  if (grads && !interns) return kind === "Graduate";
  return true;
}

const clearanceWords = /security clearance|security vetting|national security vetting|\bvetting\b|\bSC clearance|\bclearance by the/i;

/** True when the role's own line asks for a security clearance, or a company line says every candidate needs one
 * ("All candidates must get security clearance"). A line that leaves room ("many roles", "may require",
 * "several postings") doesn't count for every role. */
export function needsClearance(eligibility: string, lines: string[], kind: string): boolean {
  if (clearanceWords.test(eligibility) && !/may require|if needed|a plus/i.test(eligibility)) return true;
  return lines.some(
    (line) =>
      clearanceWords.test(line) &&
      /\b(must|all candidates|you need|required|requires|needs? to)\b/i.test(line) &&
      !/many roles|some roles|several|may require|sensitive posts|defence-related|for candidates in|the final candidates|some postings|the FAQ says/i.test(line) &&
      fitsKind(line, kind),
  );
}

/** The company's lines that name help with moving or housing: relocation money, a flat, the first month's rent.
 * Lines that say there is none, that it isn't stated, or that it only might be there ("may", "case-by-case") are left
 * out, and so is help with travel to an interview. */
export function relocationLines(lines: string[], kind: string): string[] {
  return lines.filter(
    (line) =>
      /relocat|housing|accommodation|apartments?\b|\brent\b/i.test(line) &&
      /support|assistance|allowance|budget|package|provided|provide|help|covers?|covered|cover housing|apartments|accommodation for|€|£|\d/i.test(line) &&
      !/not (mentioned|stated)|^Relocation: none|does not assist|doesn't provide|no relocation|none is provided|you must “Be able to relocate|may include|may be|might be|may also|case-by-case|depend|some postings|some positions|onsite interviews|subject to availability|ready to relocate|named for hubs|does not say how|itself does not mention/i.test(line) &&
      fitsKind(line, kind),
  );
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
