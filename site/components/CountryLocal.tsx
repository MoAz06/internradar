import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import EmailSignup from "@/components/EmailSignup";
import JsonLd from "@/components/JsonLd";
import { companies, countries } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { buildItems } from "@/lib/buildItems";
import { cityPages } from "@/lib/landing";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { breadcrumbs } from "@/lib/schema";
import { summerYear } from "@/lib/seasons";

// A country's page in its own language, for the people who search in it: "stage software engineering 2027",
// "Praktikum Softwareentwicklung München". The roles stay as the companies posted them; the page around them is
// translated. The English page and this one point at each other with hreflang.

export type Local = {
  lang: "nl" | "de";
  code: "NL" | "DE";
  path: string;
  englishPath: string;
  label: string;
  h1: string;
  title: (year: number) => string;
  intro: (n: number, m: number, year: number) => string;
  deadlinesFirst: string;
  openNow: string;
  soon: string;
  nothingOpen: string;
  nothingSoon: string;
  byCity: string;
  afterRejection: string;
  afterRejectionBlurb: string;
  welcomeSay: (names: string) => string;
  allRules: string;
  mondayH: string;
  mondayP: string;
  calendar: string;
  english: string;
  and: string;
};

export const dutch: Local = {
  lang: "nl",
  code: "NL",
  path: "/stages/",
  englishPath: "/nl/",
  label: "Nederland",
  h1: "Tech stages en startersbanen in Nederland",
  title: (year) => `Tech stages in Nederland ${year}: deadlines en sollicitatieprocedure`,
  intro: (n, m, year) =>
    `${n} tech stages, afstudeerstages en startersbanen in Nederland voor zomer ${year}, open of binnenkort open, bij ${m} bedrijven, elk met de deadline, de sollicitatieprocedure en de regel voor opnieuw solliciteren na een afwijzing. Elke nacht gecontroleerd op de carrièrepagina's van de bedrijven zelf.`,
  deadlinesFirst: "Deadlines eerst. Op de bedrijfspagina's staan de sollicitatiestappen en de regel voor opnieuw solliciteren.",
  openNow: "Nu open",
  soon: "Binnenkort open",
  nothingOpen: "Op dit moment is er niets open in Nederland.",
  nothingSoon: "Geen rol staat als binnenkort open gemarkeerd.",
  byCity: "Per stad",
  afterRejection: "Na een afwijzing",
  afterRejectionBlurb: "Wat Nederlandse bedrijven op hun eigen pagina's zeggen over een tweede poging.",
  welcomeSay: (names) => `${names} zeggen dat je opnieuw mag solliciteren.`,
  allRules: "Alle regels voor opnieuw solliciteren",
  mondayH: "Elke maandag in je mail",
  mondayP: "Wat die week sluit en wat nieuw is, in één mail. Of zet elke Nederlandse deadline in je agenda.",
  calendar: "Agendafeed voor Nederland",
  english: "This page in English",
  and: "en",
};

export const german: Local = {
  lang: "de",
  code: "DE",
  path: "/praktika/",
  englishPath: "/countries/germany/",
  label: "Deutschland",
  h1: "Tech-Praktika und Einstiegsstellen in Deutschland",
  title: (year) => `Tech-Praktika in Deutschland ${year}: Fristen und Bewerbungsprozess`,
  intro: (n, m, year) =>
    `${n} Tech-Praktika, Werkstudentenstellen und Einstiegsjobs in Deutschland für Sommer ${year}, offen oder bald offen, bei ${m} Unternehmen, jeweils mit Bewerbungsfrist, Bewerbungsprozess und der Regel für eine erneute Bewerbung nach einer Absage. Jede Nacht auf den Karriereseiten der Unternehmen geprüft.`,
  deadlinesFirst: "Fristen zuerst. Auf den Unternehmensseiten stehen die Interviewschritte und die Regel für eine erneute Bewerbung.",
  openNow: "Jetzt offen",
  soon: "Bald offen",
  nothingOpen: "Im Moment ist in Deutschland nichts offen.",
  nothingSoon: "Keine Stelle ist als bald offen markiert.",
  byCity: "Nach Stadt",
  afterRejection: "Nach einer Absage",
  afterRejectionBlurb: "Was deutsche Unternehmen auf ihren eigenen Seiten zu einem zweiten Versuch sagen.",
  welcomeSay: (names) => `${names} sagen, dass man sich erneut bewerben kann.`,
  allRules: "Alle Regeln für erneute Bewerbungen",
  mondayH: "Jeden Montag per E-Mail",
  mondayP: "Was in der Woche schließt und was neu ist, in einer E-Mail. Oder alle deutschen Fristen im Kalender.",
  calendar: "Kalenderfeed für Deutschland",
  english: "This page in English",
  and: "und",
};

const here = (code: string) => buildItems().filter((x) => x.country === code && x.status !== "closed");

export function localMetadata(t: Local): Metadata {
  const items = here(t.code);
  const year = summerYear(today());
  const d = t.intro(items.length, new Set(items.map((x) => x.slug)).size, year);
  return {
    title: { absolute: `${t.title(year)} - internradar` },
    description: d,
    alternates: { canonical: t.path, languages: { en: t.englishPath, [t.lang]: t.path } },
    ...og(t.title(year), d, t.code === "NL" ? "nl" : "companies", t.path),
  };
}

export default function CountryLocal({ t }: { t: Local }) {
  const items = here(t.code);
  const year = summerYear(today());
  const name = countries.find((k) => k.code === t.code)!;
  const open = items.filter((x) => x.status !== "soon");
  const soon = items.filter((x) => x.status === "soon");
  const nCompanies = new Set(items.map((x) => x.slug)).size;
  const cities = cityPages().filter((p) => p.countryName === name.name);
  const local = new Set(companies.filter((c) => c.country === t.code).map((c) => c.slug));
  const rules = reapplyRules.filter((r) => local.has(r.slug));
  const strict = rules.filter((r) => r.group !== "welcome");
  const welcome = rules
    .filter((r) => r.group === "welcome" && !/^no rule/i.test(r.rule))
    .map((r) => r.company)
    .sort((a, b) => a.localeCompare(b));
  const names = welcome.length === 1 ? welcome[0] : `${welcome.slice(0, -1).join(", ")} ${t.and} ${welcome.at(-1)}`;
  const slug = name.slug;
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div lang={t.lang}>
        <JsonLd data={breadcrumbs([{ name: "internradar", path: "/" }, { name: t.label, path: t.path }])} />
        <p className="text-[14px] font-bold text-accent">{t.label}</p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">{t.h1}</h1>
        <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
          {t.intro(items.length, nCompanies, year)} {t.deadlinesFirst}{" "}
          <Link href={t.englishPath} className="link" lang="en">
            {t.english}
          </Link>
          .
        </p>
        {cities.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2 max-lg:hidden">
            {cities.map((p) => (
              <li key={p.slug}>
                <Link href={`/cities/${p.slug}/`} className="inline-flex min-h-11 items-center gap-1.5 border border-line bg-surface px-3 text-[15px] hover:border-ink">
                  {p.city}
                  <span className="text-[13px] text-dim tabular-nums">{p.items.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-7 grid grid-cols-1 gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
          <div className="lg:border-r lg:border-line lg:pr-7">
            <h2 className="text-[20px] font-bold">
              {t.openNow} ({open.length})
            </h2>
            <RoleList list={open} empty={t.nothingOpen} />
          </div>
          <div className="lg:pl-7">
            {cities.length > 0 && (
              <div className="mb-7 lg:hidden">
                <h2 className="text-[20px] font-bold">{t.byCity}</h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {cities.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/cities/${p.slug}/`} className="inline-flex min-h-11 items-center gap-1.5 border border-line bg-surface px-3 text-[15px] hover:border-ink">
                        {p.city}
                        <span className="text-[13px] text-dim tabular-nums">{p.items.length}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h2 className="text-[20px] font-bold">
              {t.soon} ({soon.length})
            </h2>
            <RoleList list={soon} empty={t.nothingSoon} />

            {rules.length > 0 && (
              <div className="mt-7 border border-line bg-surface px-4 py-3.5">
                <h2 className="text-[18px] font-bold">{t.afterRejection}</h2>
                <p className="mt-1 text-[15px] leading-normal text-muted">{t.afterRejectionBlurb}</p>
                <ul className="mt-2">
                  {strict.map((r) => (
                    <li key={r.slug} className="border-t border-line first:border-t-0">
                      <Link href={`/companies/${r.slug}/`} className="group block py-2 text-[15px] leading-[1.45]">
                        <span className="font-display font-bold group-hover:underline">{r.company}</span>
                        <span className="block" lang="en">
                          {r.rule}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {welcome.length > 0 && <p className="mt-2 text-[15px] leading-normal text-muted">{t.welcomeSay(names)}</p>}
                <Link href="/reapply/" className="link inline-flex min-h-11 items-center text-[15px]">
                  {t.allRules}
                </Link>
              </div>
            )}

            <div className="mt-7 border border-line bg-surface px-4 py-3.5">
              <h2 className="text-[18px] font-bold">{t.mondayH}</h2>
              <p className="mt-1 text-[15px] leading-normal text-muted">{t.mondayP}</p>
              <EmailSignup id={`${t.lang}-email`} track={`${t.lang}-email`} edition={name.name} className="mt-3" />
              <a href={`/calendar/${slug}.ics`} className="link inline-flex min-h-11 items-center text-[15px]" data-track={`${t.lang}-calendar`}>
                {t.calendar}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
