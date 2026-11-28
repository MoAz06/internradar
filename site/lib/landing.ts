// The city and field pages: which ones exist, and their roles. A city gets a page once it has at least
// MIN roles that are open or open soon, at two companies or more, so there are no near-empty pages and no
// page that only repeats one company page.

import type { Field } from "../data/types.ts";
import { countries } from "../data/companies.ts";
import { buildItems } from "./buildItems.ts";
import { countryPageHref, fields, fold, type Item } from "./items.ts";

const MIN = 3;

export const slugOf = (s: string) =>
  fold(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const current = (items: Item[]) => items.filter((x) => x.status !== "closed");

export type CityPage = { slug: string; city: string; countryName: string; items: Item[]; companies: number };

/** Other spellings and districts that belong to a city's page. */
const sameAs: Record<string, string> = { munchen: "munich", "la-defense": "paris", "zurich-ruschlikon": "zurich" };
const shown: Record<string, string> = { munich: "Munich", paris: "Paris", zurich: "Zurich" };

/** The cities in a role's place: "Paris and Lyon" is two, "Stuttgart area (Sindelfingen)" is Stuttgart. */
export function citiesOf(place: string): { slug: string; city: string }[] {
  return place
    .replace(/\([^)]*\)/g, "")
    .split(/,| and | or |\//)
    .map((x) => x.trim().replace(/ area$/i, ""))
    .filter((x) => x && x.split(" ").length <= 3 && !/^(europe|remote|hybrid)$/i.test(x))
    .map((city) => {
      const slug = sameAs[slugOf(city)] ?? slugOf(city);
      return { slug, city: shown[slug] ?? city };
    });
}

export function cityPages(): CityPage[] {
  const byCity = new Map<string, { city: string; items: Item[] }>();
  for (const x of current(buildItems())) {
    for (const { slug, city } of citiesOf(x.city)) {
      const page = byCity.get(slug) ?? { city, items: [] };
      if (!page.items.includes(x)) page.items.push(x);
      byCity.set(slug, page);
    }
  }
  return [...byCity.entries()]
    .filter(([, p]) => p.items.length >= MIN && new Set(p.items.map((x) => x.slug)).size >= 2)
    .map(([slug, p]) => ({ slug, city: p.city, countryName: p.items[0].countryName, items: p.items, companies: new Set(p.items.map((x) => x.slug)).size }))
    .sort((a, b) => b.items.length - a.items.length || a.city.localeCompare(b.city));
}

export type CountryPage = { code: string; name: string; slug: string; items: Item[]; companies: number; cities: CityPage[] };

/** "the Netherlands", "the United Kingdom", "Germany": a country in the middle of a sentence. */
export const inCountry = (name: string) => (/^(Netherlands|United Kingdom)$/.test(name) ? `the ${name}` : name);

/** The country in a page title, the way people type it in a search box. */
export const titleName = (p: { code: string; name: string }) => (p.code === "GB" ? "the UK" : inCountry(p.name));

/** Every country with at least one role that is open or open soon, most roles first. The Netherlands is in the
 * list for the index and the "other countries" links; its page is /nl/, not /countries/netherlands/. */
export function countryPages(): CountryPage[] {
  const items = current(buildItems());
  const cities = cityPages();
  return countries
    .map((k) => {
      const here = items.filter((x) => x.country === k.code);
      return { code: k.code, name: k.name, slug: k.slug, items: here, companies: new Set(here.map((x) => x.slug)).size, cities: cities.filter((c) => c.countryName === k.name) };
    })
    .filter((p) => p.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name));
}

/** How a field reads in a headline. */
export const fieldTitle: Record<Field, string> = {
  Software: "Software engineering",
  "Data and AI": "Data and AI",
  Quant: "Quant",
  "Hardware and embedded": "Hardware and embedded",
  "Other tech": "Other tech",
};

export type FieldPage = { slug: string; field: Field; items: Item[]; companies: number };

export function fieldPages(): FieldPage[] {
  const items = current(buildItems());
  return fields.map((field) => {
    const here = items.filter((x) => x.field === field);
    return { slug: slugOf(field), field, items: here, companies: new Set(here.map((x) => x.slug)).size };
  });
}

/** "software engineering", "data and AI": a field in the middle of a sentence. */
export const lowerField = (field: Field) => fieldTitle[field].charAt(0).toLowerCase() + fieldTitle[field].slice(1);

export type PlacePage = {
  kind: "country" | "city";
  /** The slug of the country or city. */
  place: string;
  placeName: string;
  placeHref: string;
  code?: string;
  /** A field, or "Graduate" for the graduate roles of every field. */
  what: Field | "Graduate";
  whatSlug: string;
  path: string;
  items: Item[];
  companies: number;
};

/** The name the field routes use. */
export type FieldPlacePage = PlacePage;

let placeCache: PlacePage[] | null = null;

/** A field or the graduate roles in a place, "software engineering in London", "graduate jobs in the United
 * Kingdom": the pages people search for word by word. A page exists once the pair has MIN roles at two companies.
 * "Other tech" gets none: nobody searches for it by that name. */
export function allPlacePages(): PlacePage[] {
  if (placeCache) return placeCache;
  const out: PlacePage[] = [];
  const whats: (Field | "Graduate")[] = [...fields.filter((f) => f !== "Other tech"), "Graduate"];
  const add = (kind: "country" | "city", place: string, placeName: string, placeHref: string, code: string | undefined, items: Item[]) => {
    for (const what of whats) {
      const here = what === "Graduate" ? items.filter((x) => x.kind === "Graduate") : items.filter((x) => x.field === what);
      const companies = new Set(here.map((x) => x.slug)).size;
      if (here.length < MIN || companies < 2) continue;
      const whatSlug = what === "Graduate" ? "graduate" : slugOf(what);
      const path = kind === "city" ? `/cities/${place}/${whatSlug}/` : code === "NL" ? `/nl/${whatSlug}/` : `/countries/${place}/${whatSlug}/`;
      out.push({ kind, place, placeName, placeHref, code, what, whatSlug, path, items: here, companies });
    }
  };
  for (const k of countryPages()) add("country", k.slug, k.name, countryPageHref(k.code, k.name), k.code, k.items);
  for (const c of cityPages()) add("city", c.slug, c.city, `/cities/${c.slug}/`, undefined, c.items);
  placeCache = out;
  return out;
}

export const fieldPlacePages = () => allPlacePages().filter((p) => p.what !== "Graduate");
export const graduatePlacePages = () => allPlacePages().filter((p) => p.what === "Graduate");

/** The place pages a role belongs on: its field in its city and its country, and the graduate pages when it is one. */
export function placePagesFor(x: Item): PlacePage[] {
  const cities = new Set(citiesOf(x.city).map((c) => c.slug));
  return allPlacePages().filter(
    (p) => (p.what === x.field || (p.what === "Graduate" && x.kind === "Graduate")) && (p.kind === "city" ? cities.has(p.place) : p.code === x.country),
  );
}

/** "Software engineering internships" or "Tech graduate jobs": what a place page is about, for a title. */
export const whatTitle = (p: PlacePage) => (p.what === "Graduate" ? "Tech graduate jobs" : `${fieldTitle[p.what]} internships`);

/** "software engineering" or "graduate jobs": the same thing mid-sentence. */
export const whatWords = (p: PlacePage) => (p.what === "Graduate" ? "graduate jobs" : lowerField(p.what));
