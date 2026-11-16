import type { Company, Country } from "./types";
import { nl } from "./nl.ts";
import { gb } from "./gb.ts";
import { de } from "./de.ts";
import { ch } from "./ch.ts";
import { ie } from "./ie.ts";

export { radar } from "./radar.ts";

export const countries: Country[] = [
  { code: "NL", name: "Netherlands", slug: "netherlands", flag: "🇳🇱" },
  { code: "GB", name: "United Kingdom", slug: "united-kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", slug: "germany", flag: "🇩🇪" },
  { code: "CH", name: "Switzerland", slug: "switzerland", flag: "🇨🇭" },
  { code: "IE", name: "Ireland", slug: "ireland", flag: "🇮🇪" },
];

export const lastChecked = "2026-11-16";

export const companies: Company[] = [...nl, ...gb, ...de, ...ch, ...ie];

export const links = {
  repo: "https://github.com/MoAz06/internradar",
  contributing: "https://github.com/MoAz06/internradar/blob/master/CONTRIBUTING.md",
  shareProcess:
    "https://github.com/MoAz06/internradar/issues/new?template=share-your-process.yml",
};
