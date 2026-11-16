# Contributing

The value of this list is that every line can be checked. Keep it that way.

## Adding or updating a company

1. One company per pull request.
2. Every fact gets a source link and a checked date (YYYY-MM-DD). The source is the company's own careers page or job posting. Job boards, Glassdoor and news articles are not sources for the table. They can go in the notes.
3. All data lives in `site/data/`, one file per country (`nl.ts`, `gb.ts`, `de.ts`, `ch.ts`, `ie.ts`). Copy an existing company, the types in `site/data/types.ts` say what each field means. Fill in what you can verify, write "Not stated" for the rest. Do not guess.
4. Run `npm run gen` in `site/`. It rewrites the tables in `README.md` and the page in `companies/`. Do not edit those by hand, the next run overwrites them and the deploy check fails.
5. If a window has closed or a role is gone, set the status to closed and keep the role. Next year's applicants want to know when it was open.

## Candidate reports

Your own experience with a company's process is the most useful thing you can add: how long each step took, what kind of assessment it was, how many rounds, when you heard back.

The easy way: open a [Share your hiring process](../../issues/new?template=share-your-process.yml) issue. It is a form, no git needed, and we put it on the company page for you.

If you prefer a pull request, add it to the `reports` list of the company in `site/data/`, then run `npm run gen`. It shows up on the company page like this:

```
**Software Engineer Internship 2027, applied November 2026.** Applied 3 Nov → OA invite 4 Nov (7 days to complete) → OA done 8 Nov, 90 min, three problems on HackerRank → screening call 14 Nov, 75 min → waiting. Outcome: in progress.
```

- Write what happened to you, with the month and year. Not what a friend said.
- Do not post interview questions or assessment content. Describe the format, not the problems.
- Keep company names, no recruiter names.

## Writing

Write it yourself, in plain words. Short lines, facts, dates. No marketing text copied from the careers page beyond what is needed to describe the role, and no AI-generated text.

## Other countries

Add the country to `countries` in `site/data/companies.ts` and give it a data file. Netherlands is first only because the maintainer is there.
