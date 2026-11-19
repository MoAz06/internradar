import { fold } from "./items.ts";

/** Words that mean the same thing in a search. Typing any one of them also finds the others.
 * A RegExp is for a word that would otherwise match too much ("intern" is in "international"). */
const groups: (string | RegExp)[][] = [
  ["swe", "sde", "software", "developer", "programmer", "coding"],
  ["ai", "ml", "machine learning", "artificial intelligence", "llm", "genai", "deep learning", "ki"],
  ["ds", "data science", "data scientist"],
  ["sre", "devops", "site reliability", "platform engineer"],
  ["fe", "frontend", "front-end", "front end"],
  ["be", "backend", "back-end", "back end"],
  ["fullstack", "full-stack", "full stack"],
  ["grad", "graduate", "new grad", "trainee", "traineeship", "young talent", "early career", "career starter"],
  ["intern", /\binterns?(hips?)?\b/, "stage", "stagiaire", "stagiair", "praktikum", "placement", "werkstudent", "working student", "tirocinio"],
  ["thesis", "afstuderen", "afstudeer", "graduation assignment", "graduation internship", "tesi", "abschlussarbeit", "masterarbeit", "memoire"],
  ["hardware", "embedded", "firmware", "fpga", "asic", "rtl", "chip", "semiconductor"],
  ["security", "cyber", "cybersecurity", "infosec"],
  ["cloud", "aws", "azure", "gcp"],
  ["phd", "doctoral", "doctorate"],
  ["the hague", "den haag", "hague"],
  ["munich", "munchen"],
  ["cologne", "koln"],
  ["milan", "milano"],
  ["turin", "torino"],
  ["warsaw", "warszawa"],
  ["lisbon", "lisboa"],
  ["vienna", "wien"],
  ["copenhagen", "kobenhavn"],
  ["geneva", "geneve", "genf"],
  ["brussels", "bruxelles", "brussel"],
  ["gothenburg", "goteborg"],
  ["nuremberg", "nurnberg"],
  ["antwerp", "antwerpen"],
  ["uk", "united kingdom", "britain", "england"],
  ["nl", "netherlands", "holland", "nederland"],
  ["germany", "deutschland"],
  ["switzerland", "schweiz", "suisse"],
  ["spain", "espana"],
  ["italy", "italia"],
  ["poland", "polska"],
  ["austria", "osterreich"],
  ["belgium", "belgie", "belgique"],
  ["sweden", "sverige"],
  ["denmark", "danmark"],
  ["finland", "suomi"],
  ["norway", "norge"],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wholeWord = (w: string) => new RegExp(`(^|[^a-z0-9])${escape(w)}(?![a-z0-9])`);
const wordStart = (w: string) => new RegExp(`(^|[^a-z0-9])${escape(w)}`);

/** How one term is looked for: short ones as a whole word ("ml" is not in "html"), longer ones anywhere. */
const matcher = (t: string | RegExp) => (t instanceof RegExp ? t : t.length <= 3 ? wholeWord(t) : { test: (h: string) => h.includes(t) });

/** Levenshtein distance, giving up once it is over `max`. */
function near(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > max) return false;
    prev = row;
  }
  return prev[b.length] <= max;
}

export type Searchable = { hay: string; words: string[] };

/** The text of one role, ready to search. */
export function searchable(parts: string[]): Searchable {
  const hay = fold(parts.join(" "));
  return { hay, words: [...new Set(hay.split(/[^a-z0-9+#]+/).filter((w) => w.length >= 4))] };
}

/** A test for one search box value: every word has to match, through itself, a word that means the same,
 * or a small typo (one letter off from 5 letters, two from 9). */
export function query(q: string): ((s: Searchable) => boolean) | null {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const tests = words.map((w) => {
    const group = groups.find((g) => g.some((t) => t === w));
    // a short word on its own matches the start of a word, so "go" finds Google while typing; a known short word ("ai") matches only itself
    const exact = group?.find((t): t is RegExp => t instanceof RegExp && t.test(w));
    const own = exact ?? (w.length <= 3 ? (group ? wholeWord(w) : wordStart(w)) : { test: (h: string) => h.includes(w) });
    const also = (group ?? []).filter((t) => t !== w).map(matcher);
    const typo = w.length >= 5 ? (w.length >= 9 ? 2 : 1) : 0;
    return (s: Searchable) => own.test(s.hay) || also.some((m) => m.test(s.hay)) || (typo > 0 && s.words.some((x) => near(w, x, typo)));
  });
  return (s) => tests.every((t) => t(s));
}
