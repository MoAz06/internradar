// The universities with a page of their own (/for/<slug>/) and an embed for their study associations. A
// university's roles are the ones in the cities you can reach from it by train in about an hour, by city page slug
// (lib/landing.ts). `refs` are the ?ref= codes of its associations, so a poster or embed link says where it came from.

import { buildItems } from "./buildItems.ts";
import { citiesOf } from "./landing.ts";
import type { Item } from "./items.ts";
import { countries } from "../data/companies.ts";

export type University = {
  slug: string;
  /** as students say it: "TU Delft", "Imperial" */
  name: string;
  city: string;
  country: string;
  /** city slugs within reach, its own city first */
  near: string[];
  /** the study associations we wrote to, with their ?ref= code */
  associations: { name: string; ref: string }[];
};

const randstad = ["amsterdam", "the-hague", "den-haag", "rotterdam", "leiden", "delft", "utrecht", "noordwijk", "schiphol", "zaandam", "soesterberg", "pernis"];
const brabant = ["eindhoven", "veldhoven", "veghel", "tilburg", "s-hertogenbosch", "den-bosch"];
const flanders = ["leuven", "brussels", "vlaams-brabant", "tienen", "antwerp", "ghent", "gent", "kortrijk", "mechelen"];
const london = ["london", "luton", "hatfield", "harpenden", "reading", "basildon", "frimley", "farnborough", "thames-valley", "newbury"];
const cambridge = ["cambridge", "near-cambridge", "melbourn", "london"];
const munich = ["munich", "garching-bei-munchen", "unterfohring", "unterschlei-heim", "feldkirchen", "ingolstadt", "regensburg", "donauworth", "ansbach"];

export const universities: University[] = [
  { slug: "leiden", name: "Leiden University", city: "Leiden", country: "NL", near: ["leiden", "noordwijk", ...randstad], associations: [{ name: "De Leidsche Flesch", ref: "flesch" }] },
  { slug: "tu-delft", name: "TU Delft", city: "Delft", country: "NL", near: ["delft", ...randstad], associations: [{ name: "W.I.S.V. Christiaan Huygens", ref: "ch" }, { name: "ETV", ref: "etv" }] },
  { slug: "uva", name: "University of Amsterdam", city: "Amsterdam", country: "NL", near: ["amsterdam", ...randstad], associations: [{ name: "VIA", ref: "via" }, { name: "VSAE", ref: "vsae" }, { name: "NSA", ref: "nsa" }] },
  { slug: "vu", name: "Vrije Universiteit Amsterdam", city: "Amsterdam", country: "NL", near: ["amsterdam", ...randstad], associations: [{ name: "STORM", ref: "storm" }, { name: "Kraket", ref: "kraket" }] },
  { slug: "utrecht", name: "Utrecht University", city: "Utrecht", country: "NL", near: ["utrecht", ...randstad, "eindhoven", "apeldoorn"], associations: [{ name: "Sticky", ref: "sticky" }, { name: "Incognito", ref: "uscki" }, { name: "A-Eskwadraat", ref: "aes" }] },
  { slug: "erasmus", name: "Erasmus University Rotterdam", city: "Rotterdam", country: "NL", near: ["rotterdam", ...randstad], associations: [{ name: "FAECTOR", ref: "faector" }] },
  { slug: "tu-eindhoven", name: "TU Eindhoven", city: "Eindhoven", country: "NL", near: [...brabant, "utrecht"], associations: [{ name: "GEWIS", ref: "gewis" }, { name: "Pattern", ref: "pattern" }, { name: "Thor", ref: "thor" }] },
  { slug: "tilburg", name: "Tilburg University", city: "Tilburg", country: "NL", near: ["tilburg", "eindhoven", "veldhoven", "veghel", "s-hertogenbosch", "rotterdam", "utrecht"], associations: [{ name: "Enigma", ref: "enigma" }, { name: "Flow", ref: "flow" }, { name: "Asset", ref: "asset" }] },
  { slug: "twente", name: "University of Twente", city: "Enschede", country: "NL", near: ["enschede", "hengelo", "apeldoorn"], associations: [{ name: "Inter-Actief", ref: "ia" }, { name: "Proto", ref: "proto" }, { name: "Abacus", ref: "abacus" }, { name: "Scintilla", ref: "scintilla" }] },
  { slug: "groningen", name: "University of Groningen", city: "Groningen", country: "NL", near: ["groningen"], associations: [{ name: "Cover", ref: "cover" }, { name: "VESTING", ref: "vesting" }, { name: "FMF", ref: "fmf" }] },
  { slug: "radboud", name: "Radboud University", city: "Nijmegen", country: "NL", near: ["nijmegen", "arnhem", "veghel", "eindhoven", "utrecht"], associations: [{ name: "Thalia", ref: "thalia" }, { name: "CognAC", ref: "cognac" }, { name: "Desda", ref: "desda" }] },
  { slug: "maastricht", name: "Maastricht University", city: "Maastricht", country: "NL", near: ["maastricht", "eindhoven", "aachen", "leuven"], associations: [{ name: "MSV Incognito", ref: "msv-incognito" }, { name: "Vectum", ref: "vectum" }] },
  { slug: "ku-leuven", name: "KU Leuven", city: "Leuven", country: "BE", near: flanders, associations: [{ name: "Wina", ref: "wina-leuven" }, { name: "VTK", ref: "vtk-leuven" }] },
  { slug: "ugent", name: "Ghent University", city: "Ghent", country: "BE", near: ["ghent", "gent", "kortrijk", "brussels", "antwerp", "leuven"], associations: [{ name: "Zeus WPI", ref: "zeus" }, { name: "WiNA", ref: "wina-gent" }, { name: "VTK", ref: "vtk-gent" }] },
  { slug: "vub", name: "VUB", city: "Brussels", country: "BE", near: ["brussels", ...flanders], associations: [{ name: "Infogroep", ref: "infogroep" }, { name: "Polytechnische Kring", ref: "pk" }] },
  { slug: "antwerp", name: "University of Antwerp", city: "Antwerp", country: "BE", near: ["antwerp", "brussels", "leuven", "mechelen", "ghent"], associations: [{ name: "WINAK", ref: "winak" }] },
  { slug: "hasselt", name: "Hasselt University", city: "Hasselt", country: "BE", near: ["hasselt", "leuven", "tienen", "maastricht"], associations: [{ name: "Filii Lamberti", ref: "filii" }] },
  { slug: "imperial", name: "Imperial College London", city: "London", country: "GB", near: london, associations: [{ name: "DoCSoc", ref: "docsoc" }] },
  { slug: "ucl", name: "UCL", city: "London", country: "GB", near: london, associations: [{ name: "UCL CSS", ref: "uclcss" }] },
  { slug: "lse", name: "LSE", city: "London", country: "GB", near: london, associations: [{ name: "Data Science and Quant Society", ref: "lse-dsq" }] },
  { slug: "cambridge", name: "University of Cambridge", city: "Cambridge", country: "GB", near: cambridge, associations: [{ name: "CUCaTS", ref: "cucats" }] },
  { slug: "oxford", name: "University of Oxford", city: "Oxford", country: "GB", near: ["oxford", "reading", "newbury", "thames-valley", "london"], associations: [{ name: "CompSoc", ref: "oxcompsoc" }] },
  { slug: "edinburgh", name: "University of Edinburgh", city: "Edinburgh", country: "GB", near: ["edinburgh", "glasgow"], associations: [{ name: "CompSoc", ref: "edcompsoc" }] },
  { slug: "warwick", name: "University of Warwick", city: "Coventry", country: "GB", near: ["coventry", "warwick", "leamington-spa", "birmingham", "london"], associations: [{ name: "UWCS", ref: "uwcs" }] },
  { slug: "bristol", name: "University of Bristol", city: "Bristol", country: "GB", near: ["bristol", "bath", "newport", "cardiff"], associations: [{ name: "CSS", ref: "cssbristol" }] },
  { slug: "manchester", name: "University of Manchester", city: "Manchester", country: "GB", near: ["manchester", "leeds", "sheffield", "halifax", "chester", "liverpool"], associations: [{ name: "UniCS", ref: "unics" }] },
  { slug: "southampton", name: "University of Southampton", city: "Southampton", country: "GB", near: ["southampton", "farnborough", "frimley", "reading"], associations: [{ name: "ECSS", ref: "ecss" }] },
  { slug: "durham", name: "Durham University", city: "Durham", country: "GB", near: ["durham", "newcastle", "leeds"], associations: [{ name: "CompSoc", ref: "durham" }] },
  { slug: "trinity-dublin", name: "Trinity College Dublin", city: "Dublin", country: "IE", near: ["dublin", "leixlip", "maynooth"], associations: [{ name: "DUCSS", ref: "ducss" }] },
  { slug: "ucd", name: "UCD", city: "Dublin", country: "IE", near: ["dublin", "leixlip", "maynooth"], associations: [{ name: "Netsoc", ref: "netsoc" }] },
  { slug: "eth-zurich", name: "ETH Zürich", city: "Zurich", country: "CH", near: ["zurich", "adliswil", "basel", "bern"], associations: [{ name: "VIS", ref: "vis" }] },
  { slug: "epfl", name: "EPFL", city: "Lausanne", country: "CH", near: ["lausanne", "geneva", "bern"], associations: [{ name: "CLIC", ref: "clic" }] },
  { slug: "tum", name: "TU München", city: "Munich", country: "DE", near: munich, associations: [{ name: "Fachschaft MPIC", ref: "mpic" }] },
  { slug: "kth", name: "KTH", city: "Stockholm", country: "SE", near: ["stockholm", "sodertalje", "vaesteras"], associations: [{ name: "Datasektionen", ref: "datasektionen" }] },
  { slug: "chalmers", name: "Chalmers", city: "Gothenburg", country: "SE", near: ["gothenburg", "goteborg"], associations: [{ name: "D-sektionen", ref: "dtek" }] },
];

/** Fewer roles than this within reach, and a university's page, embed and image show its whole country instead:
 * an empty box on an association's site is worse than none. */
export const FEW = 5;

/** The roles near a university that are open or open soon, deadlines first (the order buildItems gives). */
export function rolesNear(u: University, items: Item[] = buildItems()): Item[] {
  const near = new Set(u.near);
  return items.filter((x) => x.status !== "closed" && citiesOf(x.city).some((c) => near.has(c.slug)));
}

/** What a university's page, embed and image show: the roles near it, or its country's when there are few near.
 * `where` finishes "Tech internships ...": "near TU Delft" or "in Sweden". `all` has the closed ones too, for the list's
 * "also closed" filter. */
export function rolesFor(u: University, items: Item[] = buildItems()): { roles: Item[]; all: Item[]; where: string; wide: boolean } {
  const near = new Set(u.near);
  const close = items.filter((x) => citiesOf(x.city).some((c) => near.has(c.slug)));
  if (close.filter((x) => x.status !== "closed").length >= FEW) return { roles: close.filter((x) => x.status !== "closed"), all: close, where: `near ${u.name}`, wide: false };
  const country = items.filter((x) => x.country === u.country);
  return { roles: country.filter((x) => x.status !== "closed"), all: country, where: `in ${countries.find((k) => k.code === u.country)?.name ?? u.country}`, wide: true };
}

