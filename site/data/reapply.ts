/** What each company says about applying again after a rejection, word for word from its own page.
 * Every quote was found on the page at `url` on the date in `checked`. Only companies that state something are here. */

export type ReapplyGroup = "wait" | "season" | "test" | "welcome";

export type ReapplyRule = {
  company: string;
  /** Company page on the site. */
  slug: string;
  group: ReapplyGroup;
  /** The rule in a few plain words. */
  rule: string;
  /** Exact words from the page. */
  quote: string;
  /** Set when the quote is not in English. */
  lang?: string;
  url: string;
  checked: string;
  /** The waiting time as a number, only when the rule names one plainly. Used on /mine/ to give a date. */
  waitMonths?: number;
  waitDays?: number;
};

export const reapplyGroups: { id: ReapplyGroup; title: string; blurb: string }[] = [
  { id: "wait", title: "A waiting time", blurb: "These name how long you wait after a rejection." },
  { id: "season", title: "Once per season or year", blurb: "One go per recruitment season or year, then wait for the next one." },
  { id: "test", title: "The test only once", blurb: "Fail the online test and you can't take it again." },
  { id: "welcome", title: "Try again, no waiting time", blurb: "These say you're welcome to apply again and give no waiting time." },
];

const day = "2026-11-18";

export const reapplyRules: ReapplyRule[] = [
  // a waiting time, longest first
  {
    company: "Shell",
    slug: "shell",
    group: "wait",
    rule: "A new application within 10 months of a rejection is turned down automatically.",
    quote: "if you have an unsuccessful application and re-apply to a different position in a 10-month period, your application will be automatically regretted.",
    url: "https://www.shell.com/careers/about-careers-at-shell/early-careers/shell-graduate-programme/details-on-the-graduate-programme-and-how-to-apply.html",
    checked: day,
    waitMonths: 10,
  },
  {
    company: "Bending Spoons",
    slug: "bending-spoons-milan",
    group: "wait",
    rule: "A year before a similar job, and one application at a time.",
    quote: "We ask that you wait at least one year before you apply again for a similar job.",
    url: "https://jobs.bendingspoons.com/faq",
    checked: day,
    waitMonths: 12,
  },
  {
    company: "Mercedes-Benz",
    slug: "mercedes-benz",
    group: "wait",
    rule: "Rejected after the Inspire Day of the graduate programme: a year.",
    quote: "If you receive a rejection after our Inspire Day, you can apply again after one year.",
    url: "https://group.mercedes-benz.com/careers/graduates/inspire-journey/how-to-apply/",
    checked: day,
    waitMonths: 12,
  },
  {
    company: "Jane Street",
    slug: "jane-street-london",
    group: "wait",
    rule: "About a year for students, as a guideline.",
    quote: "We usually recommend waiting to reapply for at least a year (in the case of current students)",
    url: "https://www.janestreet.com/join-jane-street/interviewing/",
    checked: day,
    waitMonths: 12,
  },
  {
    company: "Google",
    slug: "google-london",
    group: "wait",
    rule: "Usually a year for the same type of role. At most three applications in 30 days.",
    quote: "Typically, we ask for folks to wait at least a year to gain additional experience before reapplying for the same type of role.",
    url: "https://www.google.com/about/careers/applications/how-we-hire/",
    checked: day,
    waitMonths: 12,
  },
  {
    company: "Picnic",
    slug: "picnic",
    group: "wait",
    rule: "They recommend a year between applications.",
    quote: "We recommend 1 year in between applications so you can reflect and improve on the points provided by the hiring team.",
    url: "https://jobs.picnic.app/en/faq",
    checked: day,
    waitMonths: 12,
  },
  {
    company: "Optiver",
    slug: "optiver",
    group: "wait",
    rule: "8 months after an online test or interview for any intern or graduate role, at any office.",
    quote: "We welcome you to re-apply after the 8-month cool off period.",
    url: "https://optiver.com/join-us/jobs/technology/amsterdam/software-engineer-internship-2027-start/",
    checked: day,
    waitMonths: 8,
  },
  {
    company: "Helsing",
    slug: "helsing-munich",
    group: "wait",
    rule: "At least 6 months.",
    quote: "If you wish to re-apply, Helsing asks that you wait at least 6 months before doing so.",
    url: "https://developer.helsing.ai/handbook/process",
    checked: day,
    waitMonths: 6,
  },
  {
    company: "Scalable Capital",
    slug: "scalable-capital-munich",
    group: "wait",
    rule: "They recommend 6 months before the same role.",
    quote: "When re-applying for a position that you have previously been rejected for, we would generally recommend to wait at least 6 months before applying again",
    url: "https://de.scalable.capital/careers",
    checked: day,
    waitMonths: 6,
  },
  {
    company: "Accenture",
    slug: "accenture-amsterdam",
    group: "wait",
    rule: "A failed online assessment can be taken again after 90 days. Applying again is welcome.",
    quote: "If you do not pass an assessment, you must wait at least 90 days before retaking the same assessment.",
    url: "https://www.accenture.com/nl-en/careers/explore-careers/area-of-interest/journey-to-accenture",
    checked: "2026-11-20",
  },
  {
    company: "Databricks",
    slug: "databricks",
    group: "wait",
    rule: "One application in 30 days.",
    quote: "We can only consider one application in 30 days.",
    url: "https://boards-api.greenhouse.io/v1/boards/databricks/jobs/6866534002",
    checked: day,
    waitDays: 30,
  },

  // once per season or year
  {
    company: "IMC",
    slug: "imc",
    group: "season",
    rule: "The same role again when the next season starts, in summer 2027.",
    quote: "If you have already applied for this position during the current recruitment season and were not selected, you may reapply when the next recruitment season begins in Summer 2027.",
    url: "https://www.imc.com/eu/careers/jobs/4667854101",
    checked: day,
  },
  {
    company: "Deutsche Bank",
    slug: "deutsche-bank-germany",
    group: "season",
    rule: "Usually no second role in the same hiring year.",
    quote: "In most instances, if you are unsuccessful for one role you cannot be considered for another in the same hiring year.",
    url: "https://careers.db.com/students-graduates/your-application/faq/",
    checked: day,
  },
  {
    company: "Lloyds",
    slug: "lloyds-banking-group-leeds",
    group: "season",
    rule: "One application per year for the graduate schemes, and no second try at the online test.",
    quote: "Only one application per candidate is accepted per year.",
    url: "https://www.lloydsbankinggrouptalent.com/our-opportunities/graduates/graduates-faqs/",
    checked: day,
  },
  {
    company: "HSBC",
    slug: "hsbc-sheffield",
    group: "season",
    rule: "One application per recruitment cycle.",
    quote: "We only accept one application per recruitment cycle",
    url: "https://apply.careers.hsbc.com/emergingtalent/job/Sheffield-Engineering-Graduate-S1-4NB/1373794457/",
    checked: day,
  },
  {
    company: "UBS",
    slug: "ubs-zurich",
    group: "season",
    rule: "Switzerland, the US and APAC: three applications per academic year. No second try at the tests.",
    quote: "For roles based in Switzerland, the US or in APAC, we accept a maximum of three applications across all our business divisions and regional offices during the same academic year.",
    url: "https://www.ubs.com/global/en/careers/early-careers/faq.html",
    checked: day,
  },
  {
    company: "Microsoft",
    slug: "microsoft-dublin",
    group: "season",
    rule: "A new application every year, even if you interviewed last year.",
    quote: "All candidates must submit a new application each year.",
    url: "https://careers.microsoft.com/v2/global/en/universityinternship",
    checked: day,
  },
  {
    company: "JPMorgan",
    slug: "jpmorgan-chase-london",
    group: "season",
    rule: "The same programme again in a later year.",
    quote: "If you meet the eligibility requirements, you can submit a new application for the same program in future program years.",
    url: "https://www.jpmorganchase.com/careers/how-we-hire/faqs",
    checked: day,
  },
  {
    company: "Wärtsilä",
    slug: "wartsila-vaasa",
    group: "season",
    rule: "Apply again every year. Last year's application doesn't count.",
    quote: "The old applications are no longer valid for this recruitment.",
    url: "https://www.wartsila.com/summerpower/summer-power-faq",
    checked: day,
  },

  // the test only once
  {
    company: "Da Vinci",
    slug: "da-vinci-trading",
    group: "test",
    rule: "The online quiz can be taken once.",
    quote: "candidates are only allowed to take the same assessment once",
    url: "https://davincitrading.com/faq/",
    checked: day,
  },

  // welcome, no waiting time
  {
    company: "Tesla",
    slug: "tesla-amsterdam",
    group: "welcome",
    rule: "Students may apply to the same position for more than one term.",
    quote: "Eligible students may reapply to the same position for multiple terms.",
    url: "https://www.tesla.com/careers/intern-resources",
    checked: day,
  },
  {
    company: "ASML",
    slug: "asml",
    group: "welcome",
    rule: "Apply again for another job.",
    quote: "We encourage you to search for a job at ASML that matches your skill set and apply again.",
    url: "https://www.asml.com/en/careers/interview-tips",
    checked: day,
  },
  {
    company: "Capgemini",
    slug: "capgemini-utrecht",
    group: "welcome",
    rule: "Apply for other roles after a rejection.",
    quote: "Ik heb een afwijzing ontvangen. Kan ik nog steeds op andere functies solliciteren? Zeker! We zijn altijd op zoek naar nieuw talent.",
    lang: "Dutch",
    url: "https://www.capgemini.com/nl-nl/carriere/kom-bij-ons-werken/recruitment-proces/",
    checked: "2026-11-20",
  },
  {
    company: "Rabobank",
    slug: "rabobank",
    group: "welcome",
    rule: "Apply again for another vacancy.",
    quote: "We certainly encourage you to apply again if you are interested in another vacancy.",
    url: "https://rabobank.jobs/en/faq/",
    checked: day,
  },
  {
    company: "Swisscom",
    slug: "swisscom-bern",
    group: "welcome",
    rule: "Apply for other jobs after a rejection.",
    quote: "I have received a rejection. Can I still apply for other jobs? Of course!",
    url: "https://www.swisscom.ch/en/about/career/faq.html",
    checked: day,
  },
  {
    company: "Arm",
    slug: "arm",
    group: "welcome",
    rule: "Apply again next year.",
    quote: "Can I re-apply next year if I have been unsuccessful this year? Yes, you are welcome to re-apply.",
    url: "https://careers.arm.com/emerging-talent-faq",
    checked: day,
  },
  {
    company: "Philips",
    slug: "philips",
    group: "welcome",
    rule: "Apply again, one application per role.",
    quote: "We would be very happy to consider your application again",
    url: "https://www.careers.philips.com/global/en/faq",
    checked: day,
  },
  {
    company: "ING",
    slug: "ing",
    group: "welcome",
    rule: "Apply to other roles.",
    quote: "We encourage you to explore other matches, sometimes timing or team fit plays a role.",
    url: "https://careers.ing.com/en/working-in-the-netherlands-recruitment-faq",
    checked: day,
  },
  {
    company: "CARIAD",
    slug: "cariad-ingolstadt",
    group: "welcome",
    rule: "Try again, maybe for another position.",
    quote: "You're welcome to try again, and there may well be another position that's better suited to you and your skills.",
    url: "https://cariad.technology/de/en/careers/recruiting-process.html",
    checked: day,
  },
  {
    company: "Equinor",
    slug: "equinor-stavanger",
    group: "welcome",
    rule: "Apply again later.",
    quote: "you are very welcome to apply again at a later stage if you find a position suitable for you.",
    url: "https://www.equinor.com/careers/faq",
    checked: day,
  },
  {
    company: "ZEISS",
    slug: "zeiss-germany",
    group: "welcome",
    rule: "Apply to as many jobs as you like. Nothing on what happens after a rejection.",
    quote: "Ja, Du kannst Dich auf beliebig viele Stellen bewerben.",
    lang: "de",
    url: "https://www.zeiss.com/career/de/bewerbung.html",
    checked: day,
  },
  {
    company: "Miro",
    slug: "miro",
    group: "welcome",
    rule: "No rule from Miro itself. An Amsterdam employee on the hiring page says to try again.",
    quote: "If you don't succeed the first time, it doesn't mean you're not right for Miro. So don't be put off from trying again.",
    url: "https://miro.com/careers/how-we-hire/",
    checked: day,
  },
  {
    company: "NXP Semiconductors",
    slug: "nxp-eindhoven",
    group: "welcome",
    rule: "Apply again to a similar or other role, any time.",
    quote: "If you were not selected for a particular role, you may always reapply to a similar or alternate role at any time.",
    url: "https://www.nxp.com/company/about-nxp/careers/career-faqs:CAREERS-FAQ",
    checked: day,
  },
];
