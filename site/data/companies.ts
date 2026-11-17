import type { Company, Country } from "./types";
import { nl } from "./nl.ts";
import { gb } from "./gb.ts";
import { de } from "./de.ts";
import { ch } from "./ch.ts";
import { ie } from "./ie.ts";
import { fr } from "./fr.ts";
import { se } from "./se.ts";
import { dk } from "./dk.ts";
import { fi } from "./fi.ts";
import { no } from "./no.ts";
import { es } from "./es.ts";
import { pt } from "./pt.ts";
import { pl } from "./pl.ts";
import { at } from "./at.ts";
import { be } from "./be.ts";
import { it } from "./it.ts";

export { radar } from "./radar.ts";

export const countries: Country[] = [
  { code: "NL", name: "Netherlands", slug: "netherlands", flag: "🇳🇱" },
  { code: "GB", name: "United Kingdom", slug: "united-kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", slug: "germany", flag: "🇩🇪" },
  { code: "CH", name: "Switzerland", slug: "switzerland", flag: "🇨🇭" },
  { code: "IE", name: "Ireland", slug: "ireland", flag: "🇮🇪" },
  { code: "FR", name: "France", slug: "france", flag: "🇫🇷" },
  { code: "SE", name: "Sweden", slug: "sweden", flag: "🇸🇪" },
  { code: "DK", name: "Denmark", slug: "denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", slug: "finland", flag: "🇫🇮" },
  { code: "NO", name: "Norway", slug: "norway", flag: "🇳🇴" },
  { code: "ES", name: "Spain", slug: "spain", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", slug: "portugal", flag: "🇵🇹" },
  { code: "PL", name: "Poland", slug: "poland", flag: "🇵🇱" },
  { code: "AT", name: "Austria", slug: "austria", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", slug: "belgium", flag: "🇧🇪" },
  { code: "IT", name: "Italy", slug: "italy", flag: "🇮🇹" },
];

export const lastChecked = "2026-11-17";

export const companies: Company[] = [...nl, ...gb, ...de, ...ch, ...ie, ...fr, ...se, ...dk, ...fi, ...no, ...es, ...pt, ...pl, ...at, ...be, ...it];

export const links = {
  repo: "https://github.com/MoAz06/internradar",
  linkedin: "https://www.linkedin.com/in/mohamed-azahrioui/",
  contributing: "https://github.com/MoAz06/internradar/blob/master/CONTRIBUTING.md",
  shareProcess:
    "https://github.com/MoAz06/internradar/issues/new?template=share-your-process.yml",
};
