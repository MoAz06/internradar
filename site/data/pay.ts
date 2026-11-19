import type { RoleKind } from "./types.ts";

/** Pay a company states, matched to the roles it is stated for. Only figures from the company's own
 * pages (the `pay` lines in the country files say where). A role with no entry here shows no pay.
 *
 * `label` is for the role page, `short` for the list.
 * `month` is the lowest stated figure as euros a month, for sorting only. It is left out when the
 * page doesn't name the period. Other currencies are converted at fixed rates (see `rates`). */
export type Pay = { label: string; short: string; month?: number };
type Rule = { kind?: RoleKind; title?: RegExp; pay: Pay };

/** Fixed rates for sorting only. The figure people see stays in the company's own currency. */
export const rates = { EUR: 1, GBP: 1.17, CHF: 1.06, PLN: 0.235 };
const yearly = (n: number, cur: keyof typeof rates = "EUR") => Math.round((n / 12) * rates[cur]);
const monthly = (n: number, cur: keyof typeof rates = "EUR") => Math.round(n * rates[cur]);

const lloyds: Rule[] = [{ kind: "Graduate", pay: { label: "£48,500 (graduate schemes, period not stated)", short: "£48,500" } }];

export const payRules: Record<string, Rule[]> = {
  "da-vinci-trading": [{ kind: "Graduate", pay: { label: "€100,000 a year base salary, a €20,000 sign-on bonus and variable pay", short: "€100k/yr", month: yearly(100000) } }],
  asml: [{ kind: "Internship", pay: { label: "€600 a month for EU students on a bachelor's or master's (full time)", short: "€600/mo", month: 600 } }],
  bol: [{ pay: { label: "€550 a month", short: "€550/mo", month: 550 } }],
  philips: [{ pay: { label: "€500 to €700 a month gross (full time), depending on education level", short: "€500–700/mo", month: 500 } }],
  "google-amsterdam": [
    { title: /Student Researcher/, pay: { label: "€68,500 (Bachelor's), €71,000 (Master's), €86,500 (PhD); the posting doesn't say if this is a year", short: "€68,500+" } },
    { title: /Product Deployment/, pay: { label: "€49,200 (Bachelor's), €49,000 (Master's); the posting doesn't say if this is a year", short: "€49,000+" } },
  ],
  microsoft: [{ pay: { label: "€800 a month base pay", short: "€800/mo", month: 800 } }],
  ing: [{ kind: "Internship", pay: { label: "€700 a month", short: "€700/mo", month: 700 } }],
  "abn-amro": [{ kind: "Internship", pay: { label: "€750 a month for a 36-hour week", short: "€750/mo", month: 750 } }],
  rabobank: [
    { title: /DevOps/, pay: { label: "€4,007.80 a month for a 40-hour week, plus a thirteenth month and 8% holiday allowance", short: "€4,008/mo", month: 4008 } },
    { title: /Data & Analytics|IT & Engineering/, pay: { label: "€4,007.80 on the programme page (period not stated there)", short: "€4,008" } },
    { title: /Business & IT/, pay: { label: "€3,600 on the programme page (period not stated)", short: "€3,600" } },
  ],
  mendix: [{ pay: { label: "€52,100 to €78,200 a year, plus incentive pay", short: "€52–78k/yr", month: yearly(52100) } }],
  kpn: [
    { kind: "Graduate", pay: { label: "€3,900 a month gross for 40 hours, plus a 13th month and 8% holiday pay", short: "€3,900/mo", month: 3900 } },
    { kind: "Internship", pay: { label: "€600 a month gross for a 40-hour week", short: "€600/mo", month: 600 } },
  ],
  "tno-den-haag": [
    { kind: "Internship", pay: { label: "€615 a month (full time)", short: "€615/mo", month: 615 } },
    { kind: "Thesis", pay: { label: "€615 a month (full time)", short: "€615/mo", month: 615 } },
  ],
  "hudson-river-trading-london": [
    { kind: "Internship", pay: { label: "£4,350 a week base salary, plus a signing bonus, housing and meals", short: "£4,350/wk", month: monthly((4350 * 52) / 12, "GBP") } },
  ],
  arm: [{ pay: { label: "£48,000 a year (Bachelor's) or £49,000 (Master's)", short: "£48–49k/yr", month: yearly(48000, "GBP") } }],
  "microsoft-research-cambridge": [{ pay: { label: "£4,853 a month base pay", short: "£4,853/mo", month: monthly(4853, "GBP") } }],
  "graphcore-bristol": [
    { kind: "Graduate", pay: { label: "£45,000 a year", short: "£45k/yr", month: yearly(45000, "GBP") } },
    { kind: "Internship", pay: { label: "£2,500 a month", short: "£2,500/mo", month: monthly(2500, "GBP") } },
  ],
  "lloyds-banking-group-leeds": [
    ...lloyds,
    { title: /Industrial Placement/, pay: { label: "£29,000 (period not stated)", short: "£29,000" } },
  ],
  "lloyds-banking-group-bristol": lloyds,
  "lloyds-banking-group-edinburgh": lloyds,
  "lloyds-banking-group-manchester": lloyds,
  "lloyds-banking-group-halifax": lloyds,
  "lloyds-banking-group-chester": lloyds,
  "bae-systems-frimley": [{ pay: { label: "£34,000 a year plus a £2,000 welcome bonus", short: "£34k/yr", month: yearly(34000, "GBP") } }],
  bosch: [{ title: /Mandatory|Pflichtpraktikum/i, pay: { label: "€1,505 a month for mandatory internships (Bosch student page)", short: "€1,505/mo", month: 1505 } }],
  "google-munich": [{ title: /Student Researcher/, pay: { label: "€68,500 a year (Bachelor's), €71,000 (Master's), €85,000 (PhD)", short: "€68.5k+/yr", month: yearly(68500) } }],
  "sap-germany": [{ title: /STAR/, pay: { label: "€2,150 a month in year 1 and €2,280 a month in year 2", short: "€2,150/mo", month: 2150 } }],
  "cariad-ingolstadt": [{ pay: { label: "€13.90 an hour, 35 hours a week", short: "€13.90/hr", month: Math.round((13.9 * 35 * 52) / 12) } }],
  "sbb-bern": [
    { title: /Hochschulpraktikum/, pay: { label: "CHF 2,800 a month during the Bachelor, CHF 3,800 after it and during the Master, CHF 4,800 after the Master (100%)", short: "CHF 2,800+/mo", month: monthly(2800, "CHF") } },
    { title: /Career Starter/, pay: { label: "CHF 80,000 a year (100%)", short: "CHF 80k/yr", month: yearly(80000, "CHF") } },
  ],
  sensirion: [{ kind: "Internship", pay: { label: "CHF 3,000 (Bachelor's student) or CHF 3,800 (Master's graduate); the page doesn't say per month", short: "CHF 3,000+" } }],
  "swiss-post-bern": [{ title: /Hochschulpraktikum/, pay: { label: "CHF 45,000 to 55,000 a year in the bachelor, CHF 50,000 to 65,000 in the master (gross, 13th month included)", short: "CHF 45k+/yr", month: yearly(45000, "CHF") } }],
  "google-paris": [
    { title: /Student Researcher/, pay: { label: "€53,000 (Bachelor's), €54,000 (Master's), €66,000 (PhD); period not stated", short: "€53,000+" } },
    { title: /PhD Intern/, pay: { label: "€66,000; period not stated", short: "€66,000" } },
  ],
  "doctolib-paris": [{ title: /Software Engineering Intern/, pay: { label: "€1,500 a month gross", short: "€1,500/mo", month: 1500 } }],
  "alan-paris": [{ title: /Summer Intern/, pay: { label: "€2,800 a month gross", short: "€2,800/mo", month: 2800 } }],
  "cloudflare-lisbon": [{ pay: { label: "€2,450 a month (Portugal based hires)", short: "€2,450/mo", month: 2450 } }],
  "intel-gdansk": [{ pay: { label: "At least PLN 68,880 a year", short: "PLN 68.9k+/yr", month: yearly(68880, "PLN") } }],
  "google-warsaw": [
    { title: /Software Engineering PhD/, pay: { label: "PLN 210,000; period not stated", short: "PLN 210,000" } },
    { title: /Data Science PhD/, pay: { label: "PLN 192,000 a year", short: "PLN 192k/yr", month: yearly(192000, "PLN") } },
  ],
  "citi-warsaw": [{ pay: { label: "PLN 57,672 to 88,200; period not stated", short: "PLN 57,672+" } }],
  "revolut-krakow": [
    { kind: "Graduate", pay: { label: "PLN 18,400 a month base, gross", short: "PLN 18,400/mo", month: monthly(18400, "PLN") } },
    { kind: "Internship", pay: { label: "PLN 9,500 a month base, gross", short: "PLN 9,500/mo", month: monthly(9500, "PLN") } },
  ],
  "dynatrace-linz": [{ pay: { label: "€2,139 a month gross for HTL students, €2,632 for university and FH students", short: "€2,139+/mo", month: 2139 } }],
  "infineon-villach": [{ title: /Ferial/, pay: { label: "€2,579.44 a month gross (bachelor) or €3,009.82 (master), full time", short: "€2,579+/mo", month: 2579 } }],
  "bending-spoons-milan": [{ kind: "Graduate", pay: { label: "Typical offers €66,065 to €107,837 a year outside London", short: "€66–108k/yr", month: yearly(66065) } }],
  "amazon-italy": [{ pay: { label: "€1,800 a month", short: "€1,800/mo", month: 1800 } }],
  "doctolib-milan": [{ title: /AI Engineer Intern/, pay: { label: "€1,000 a month gross", short: "€1,000/mo", month: 1000 } }],
};

/** The stated pay for one role, if its company states one that covers it. */
export function payFor(slug: string, title: string, kind: RoleKind): Pay | undefined {
  return payRules[slug]?.find((r) => (!r.kind || r.kind === kind) && (!r.title || r.title.test(title)))?.pay;
}
