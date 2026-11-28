import { buildItems } from "@/lib/buildItems";
import { today } from "@/lib/live";
import { counts, openRoles } from "@/lib/openRoles";

export const dynamic = "force-static";

const site = "https://internradar.eu";

/** What the site is and where its data is, in plain text, for language models and the tools that read them. */
export function GET() {
  const now = today();
  const n = counts(openRoles(buildItems(now)));
  const text = `# internradar

> Tech internships and new grad roles in Europe, with the hiring process at each company.

internradar lists internships, graduate roles and thesis projects in software, data and AI, quant, and hardware and embedded at ${n.companies} companies in ${n.countries} countries. ${n.roles} roles are open or opening soon, as of ${now}.

For each company it says how hiring works: the steps, the tests, the number of interviews, the pay where the company states it, and the rule on applying again after a rejection. Every fact comes from the company's own careers pages and job postings. Where a company doesn't say something, the site says it isn't stated.

The list is rebuilt every night. New postings on the companies' job boards are added, some only after a person has checked them, and postings that are gone two nights in a row are marked closed.

## Data

- [Open roles as JSON](${site}/open-roles.json): company, city, country, title, type, field, status, last day to apply, posting link, role page, company page, stated pay, named test tools, whether the role needs work rights already or a security clearance, whether the company names relocation help, and the day the job board says it went up. Rebuilt every night. The same as a spreadsheet: [open-roles.csv](${site}/open-roles.csv).
- [New roles as RSS](${site}/feeds/new.xml), and one feed per country
- [The weekly edition as RSS](${site}/feed.xml)
- [Deadlines as a calendar](${site}/deadlines.ics)
- [Every open role as one text file](${site}/llms-full.txt): by country and company, with the deadline, the pay, how the company hires, the posting and the role's page

## Pages

- [The list](${site}/): every role, by deadline, with filters for country, type, field, study level, visa and test tool
- [Companies](${site}/companies/): one page per company and city with its hiring process
- [By country](${site}/countries/): one page per country, with its cities and what its companies say about applying again
- [By city](${site}/cities/london/): one page per city, London, Amsterdam, Munich, Dublin, Zurich and more
- [By field](${site}/fields/software/): software, data and AI, quant, hardware and embedded
- A field in a place, like [software engineering in London](${site}/cities/london/software/) or [data and AI in the United Kingdom](${site}/countries/united-kingdom/data-and-ai/): under every country and city page
- Graduate jobs in a place, like [graduate jobs in the United Kingdom](${site}/countries/united-kingdom/graduate/)
- [When do applications open?](${site}/opening-dates/): the day each company's first role of the season went up
- [What changed, day by day](${site}/changes/): what the nightly check added, opened and closed, one page per day
- [Stages in Nederland](${site}/stages/) in Dutch and [Praktika in Deutschland](${site}/praktika/) in German
- [Questions, answered](${site}/answers/): which internships pay the most, who lets you reapply, which online tests companies name, what opens next, what closes this week, each answered from the data
- [Near your university](${site}/for/): the roles within reach of each university
- [Pay](${site}/pay/): the pay companies state, side by side
- [Re-apply rules](${site}/reapply/): companies with a waiting time after a rejection
- [Opening soon](${site}/radar/): programmes that open later in the season
- [About](${site}/about/): where the data comes from and how to add to it
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
