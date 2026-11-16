import type { Company, Country, RadarItem } from "./types";

export const countries: Country[] = [
  { code: "NL", name: "Netherlands" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "CH", name: "Switzerland" },
  { code: "IE", name: "Ireland" },
];

export const lastChecked = "2026-11-16";

export const companies: Company[] = [
  {
    slug: "optiver",
    name: "Optiver",
    country: "NL",
    city: "Amsterdam",
    careersUrl:
      "https://optiver.com/working-at-optiver/career-opportunities/?location=amsterdam&level=internship",
    roles: [
      {
        title: "Software Engineer Internship (2027 Start)",
        status: "open",
        applications: "Open, no deadline listed",
        start: "2027",
        duration: "10 weeks",
        eligibility:
          "Penultimate-year student in Computer Science, Computer Engineering or equivalent, able to work full time after graduating in 2028",
        process: "OA within 7 days of applying",
        reapply: "8 months, any office",
        source:
          "https://optiver.com/join-us/jobs/technology/amsterdam/software-engineer-internship-2027-start/",
        checked: "2026-11-16",
      },
      {
        title: "Quantitative Research Internship (2027 Start)",
        status: "open",
        applications: "Open, no deadline listed",
        start: "2027",
        eligibility: "See posting",
        process: "OA within 7 days",
        reapply: "8 months, any office",
        source:
          "https://optiver.com/join-us/jobs/quantitative-research-and-machine-learning/amsterdam/quantitative-research-internship-2027-start/",
        checked: "2026-11-16",
      },
      {
        title: "FPGA Internship (2027 Start)",
        status: "open",
        applications: "Open, no deadline listed",
        start: "2027",
        eligibility: "See posting",
        process: "OA within 7 days",
        reapply: "8 months, any office",
        source:
          "https://optiver.com/join-us/jobs/technology/amsterdam/fpga-internship-2027-start/",
        checked: "2026-11-16",
      },
    ],
    process: [
      "After applying, selected candidates “will be required to complete online assessments”.",
      "By applying you confirm you can “take the assessment within 7 days”.",
      "Interview steps after the assessment are not described on the posting.",
    ],
    reapply:
      "Optiver has a global re-apply policy for intern and graduate roles. If you took an online assessment or interviewed for a technology graduate or internship role at any Optiver office in the past eight months, you wait out those eight months before applying again.",
    pay: [
      "“A highly competitive internship compensation package”, no figure given.",
      "Flights and accommodation in the city centre are covered for the internship.",
      "Visa: not mentioned on the posting.",
    ],
    reports: [],
    sources: [
      {
        url: "https://optiver.com/join-us/jobs/technology/amsterdam/software-engineer-internship-2027-start/",
        checked: "2026-11-16",
      },
      {
        url: "https://optiver.com/working-at-optiver/career-opportunities/?location=amsterdam&level=internship",
        checked: "2026-11-16",
      },
      { url: "https://optiver.com/join-us/students/", checked: "2026-11-16" },
    ],
  },
  {
    slug: "imc",
    name: "IMC",
    country: "NL",
    city: "Amsterdam",
    careersUrl: "https://www.imc.com/eu/careers",
    roles: [
      {
        title: "Software Engineer Intern (summer 2027)",
        status: "open",
        applications: "Open, no deadline listed",
        start: "28 June 2027, fixed",
        duration: "Summer, weeks not stated",
        eligibility:
          "Penultimate year of a computer science, software engineering or related degree, graduating in 2028. Java or C++ preferred. Interest in financial markets, no prior knowledge needed",
        process: "Not published, prep guide linked",
        reapply: "Next season, summer 2027",
        source: "https://www.imc.com/eu/careers/jobs/4667854101",
        checked: "2026-11-16",
      },
      {
        title: "Graduate Software Engineer (2027)",
        status: "open",
        applications: "Open",
        start: "February or August 2027",
        duration: "Traineeship",
        eligibility: "Final-year students. Also offered in Aarhus",
        process: "See page",
        reapply: "See page",
        source: "https://www.imc.com/eu/careers",
        checked: "2026-11-16",
      },
    ],
    process: [
      "The intern posting does not describe assessments, rounds or timing.",
      "It links to IMC’s technology interview preparation guide. Nothing else is stated.",
    ],
    reapply:
      "If you applied this recruitment season and were not selected, “you may reapply when the next recruitment season begins in Summer 2027”.",
    pay: [
      "“Highly competitive compensation package”, no figure given.",
      "Fully furnished corporate accommodation and catered meals during the internship. Relocation assistance is not mentioned.",
      "You need a visa or permit to work in the Netherlands. If you need a Schengen visa and cannot get it before the start date, you cannot take part.",
    ],
    reports: [],
    sources: [
      { url: "https://www.imc.com/eu/careers/jobs/4667854101", checked: "2026-11-16" },
      { url: "https://www.imc.com/eu/careers", checked: "2026-11-16" },
    ],
  },
  {
    slug: "flow-traders",
    name: "Flow Traders",
    country: "NL",
    city: "Amsterdam",
    careersUrl: "https://www.flowtraders.com/careers",
    roles: [
      {
        title: "Graduate Software Development program",
        status: "rolling",
        applications: "Opens a year before the start date, closes when filled",
        start: "Not stated",
        duration: "Rotates through a few teams",
        eligibility:
          "Not stated for software. The page gives a penultimate-or-final-year rule only for the Graduate Trader program",
        process: "HackerRank, then interviews",
        reapply: "Not stated",
        source: "https://www.flowtraders.com/careers",
        checked: "2026-11-16",
      },
    ],
    process: [
      "Technology candidates usually take a HackerRank test, multiple choice or open ended.",
      "Interviews assess technical strengths and business knowledge. That outcome decides your starting team.",
      "If you do not live near the interview location, the recruitment team books flights and accommodation.",
    ],
    reapply: "Not stated.",
    pay: [
      "“A base salary and a discretionary variable component”, no figures.",
      "Visa sponsorship is available for international candidates, but not for interns.",
      "Relocation help depends on the location.",
    ],
    reports: [],
    sources: [{ url: "https://www.flowtraders.com/careers", checked: "2026-11-16" }],
  },
  {
    slug: "booking",
    name: "Booking.com",
    country: "NL",
    city: "Amsterdam",
    careersUrl: "https://careers.booking.com/early-careers",
    roles: [
      {
        title: "Software Engineering Interns (Compass)",
        status: "closed",
        applications: "Closed for 2027",
        start: "July 2027",
        duration: "9 weeks",
        eligibility: "Enrolled at a Dutch university, bachelor or master, graduating in 2028",
        process: "Take-home test, recruiter call, assessment centre day",
        reapply: "Not stated",
        source: "https://careers.booking.com/booking-com-compass-internship/",
        checked: "2026-11-16",
      },
      {
        title: "Software Engineering Grads (Compass)",
        status: "soon",
        applications: "Opens 4 January 2027",
        start: "September 2027",
        duration: "12 months, rotational",
        eligibility: "Graduating 2026 or 2027 from a Dutch university, bachelor or master",
        process: "Not described on the page",
        reapply: "Not stated",
        source: "https://careers.booking.com/booking-com-compass-se/",
        checked: "2026-11-16",
      },
      {
        title: "Data Science & Analytics Grads",
        status: "soon",
        applications: "Opens February 2027",
        start: "September 2027",
        duration: "12 months",
        eligibility: "Graduating 2026 or 2027 from a Dutch university, bachelor or master",
        process: "Not described on the page",
        reapply: "Not stated",
        source: "https://careers.booking.com/booking-com-compass-ds/",
        checked: "2026-11-16",
      },
    ],
    process: [
      "Internship: application with a CV.",
      "Technical at-home test.",
      "Recruiter phone interview.",
      "In-person assessment centre: a day of one-on-one interviews and group activities. Time between steps is not stated. The grad programme pages do not describe the process.",
    ],
    reapply: "Not stated.",
    pay: ["Not stated on the pages checked. Contact given on the page: graduates@booking.com."],
    reports: [],
    sources: [
      { url: "https://careers.booking.com/early-careers", checked: "2026-11-16" },
      { url: "https://careers.booking.com/booking-com-compass-internship/", checked: "2026-11-16" },
    ],
  },
];

export const radar: RadarItem[] = [
  {
    opens: "4 Jan 2027",
    sortKey: "2027-01-04",
    company: "Booking.com",
    slug: "booking",
    role: "Software Engineering Grads (Compass), Amsterdam",
    expect: "12 months rotational · Dutch university · graduating 2026 or 2027",
    kind: "soon",
  },
  {
    opens: "Feb 2027",
    sortKey: "2027-02-01",
    company: "Booking.com",
    slug: "booking",
    role: "Data Science & Analytics Grads, Amsterdam",
    expect: "12 months · Dutch university · graduating 2026 or 2027",
    kind: "soon",
  },
  {
    opens: "Summer 2027",
    sortKey: "2027-06-01",
    company: "IMC",
    slug: "imc",
    role: "Intern recruitment season reopens",
    expect: "If you were not selected this season, this is your next window",
    kind: "window",
  },
];

export const links = {
  repo: "https://github.com/MoAz06/internradar",
  contributing: "https://github.com/MoAz06/internradar/blob/master/CONTRIBUTING.md",
  shareProcess:
    "https://github.com/MoAz06/internradar/issues/new?template=share-your-process.yml",
};
