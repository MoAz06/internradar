// Where a posting is, read from the job board's location line: one city and one of the 16 countries on the list.
// Boards write it in many ways ("GB - Luton - Cap. Green 300", "Stuttgart, BW, Germany", "Toulouse Area",
// "Spain, Valencia, Cortes Valencianas"). Only a city in the list below counts, so an odd line gives null and the
// posting goes to a person instead.

import type { Company } from "../data/types.ts";

export type Code = Company["country"];
export type Place = { city: string; country: Code };

/** North America, so "Cambridge, MA" is not Cambridge in England. */
const america =
  /\b(united states|usa|u\.s\.a?\.?|canada)\b|,\s*(al|ak|az|ar|ca|co|ct|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc|on|qc|bc)\b(?!\.)/i;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Country names, local names and codes. Codes only count in upper case. */
const countryWords: [Code, string[], string[]][] = [
  ["NL", ["netherlands", "the netherlands", "nederland", "holland"], ["NL", "NLD"]],
  ["GB", ["united kingdom", "uk", "england", "scotland", "wales", "northern ireland", "great britain"], ["GB", "GBR", "UK"]],
  ["DE", ["germany", "deutschland"], ["DE", "DEU", "GER"]],
  ["CH", ["switzerland", "schweiz", "suisse", "svizzera"], ["CH", "CHE"]],
  ["IE", ["ireland", "eire"], ["IE", "IRL"]],
  ["FR", ["france"], ["FR", "FRA"]],
  ["SE", ["sweden", "sverige"], ["SE", "SWE"]],
  ["DK", ["denmark", "danmark"], ["DK", "DNK"]],
  ["FI", ["finland", "suomi"], ["FI", "FIN"]],
  ["NO", ["norway", "norge"], ["NO", "NOR"]],
  ["ES", ["spain", "espana"], ["ES", "ESP"]],
  ["PT", ["portugal"], ["PT", "PRT"]],
  ["PL", ["poland", "polska"], ["PL", "POL"]],
  ["AT", ["austria", "osterreich"], ["AT", "AUT"]],
  ["BE", ["belgium", "belgique", "belgie"], ["BE", "BEL"]],
  ["IT", ["italy", "italia"], ["IT", "ITA"]],
];
const byName = new Map(countryWords.flatMap(([c, names]) => names.map((n) => [n, c] as const)));
const byCode = new Map(countryWords.flatMap(([c, , codes]) => codes.map((n) => [n, c] as const)));

/** Cities by country, as the site writes them. Other spellings after a "|". */
const cityList: Record<Code, string[]> = {
  NL: ["Amsterdam", "Rotterdam", "The Hague|den haag|'s-gravenhage", "Utrecht", "Eindhoven", "Delft", "Leiden", "Groningen", "Nijmegen", "Enschede", "Veldhoven", "Hilversum", "Zaandam", "Amstelveen", "Hoofddorp", "Haarlem", "Arnhem", "Breda", "Tilburg", "Den Bosch|'s-hertogenbosch", "Maastricht", "Wageningen", "Schiphol", "Almere", "Zwolle", "Apeldoorn", "Best", "Soesterberg", "Pernis", "Deventer", "Amersfoort", "Nieuwegein", "Diemen"],
  GB: ["London", "Cambridge", "Oxford", "Edinburgh", "Manchester", "Bristol", "Glasgow", "Leeds", "Birmingham", "Belfast", "Cardiff", "Newcastle|newcastle upon tyne", "Southampton", "Reading", "Luton", "Basildon", "Frimley", "Chester", "Halifax", "Sheffield", "Nottingham", "Liverpool", "Brighton", "Guildford", "Milton Keynes", "Stevenage", "Farnborough", "Warwick", "Coventry", "York", "Leicester", "Bath", "Swindon", "Aberdeen", "Dundee", "Slough", "Bracknell", "Basingstoke", "Portsmouth", "Plymouth", "Exeter", "Ipswich", "Derby", "Preston", "Lancaster", "Crawley", "Woking", "Harlow", "Rochester", "Yeovil", "Filton", "Broughton", "Barrow-in-Furness", "Warton", "Samlesbury", "Chelmsford", "Edinburgh Park"],
  DE: ["Berlin", "Munich|munchen|muenchen|mnchen", "Hamburg", "Frankfurt|frankfurt am main", "Stuttgart", "Cologne|koln|koeln", "Dusseldorf|duesseldorf", "Dresden", "Leipzig", "Aachen", "Karlsruhe", "Heidelberg", "Mannheim", "Nuremberg|nurnberg|nuernberg", "Erlangen", "Bonn", "Hannover|hanover", "Bremen", "Darmstadt", "Walldorf", "Ingolstadt", "Wolfsburg", "Regensburg", "Augsburg", "Ulm", "Freiburg", "Jena", "Potsdam", "Kiel", "Munster|muenster", "Dortmund", "Essen", "Bochum", "Garching", "Reutlingen", "Renningen", "Schwieberdingen", "Wernau|wernau (neckar)", "Wetzlar", "Abstatt", "Leonberg", "Ludwigsburg", "Sindelfingen", "Boblingen|boeblingen", "Gerlingen", "Feuerbach", "Weissach", "Friedrichshafen", "Oberkochen", "Jena", "Neubiberg", "Unterschleissheim", "Ottobrunn", "Taufkirchen", "Immenstaad", "Bremerhaven", "Rostock", "Saarbrucken|saarbruecken", "Kaiserslautern", "Paderborn", "Bielefeld", "Gottingen|goettingen", "Magdeburg", "Chemnitz", "Ilmenau", "Bamberg", "Wurzburg|wuerzburg", "Passau", "Konstanz", "Tubingen|tuebingen", "Mainz", "Wiesbaden", "Kassel", "Halle", "Lubeck|luebeck", "Herzogenaurach", "Eschborn", "Hildesheim", "Salzgitter", "Braunschweig", "Weinheim", "Homburg", "Bruchsal", "Bühl|buhl|buehl", "Nurtingen|nuertingen"],
  CH: ["Zurich|zuerich|zurich-ruschlikon|ruschlikon", "Geneva|geneve|genf", "Lausanne", "Basel", "Bern", "Lugano", "Zug", "Winterthur", "St. Gallen|st gallen", "Lucerne|luzern", "Baden", "Schlieren", "Thalwil", "Stafa|staefa", "Neuchatel", "Fribourg", "Rapperswil", "Biel|bienne", "Villigen", "Dubendorf|duebendorf"],
  IE: ["Dublin", "Cork", "Galway", "Limerick", "Shannon", "Athlone", "Waterford", "Leixlip", "Maynooth", "Sligo", "Drogheda", "Dundalk", "Kildare"],
  FR: ["Paris", "Lyon", "Toulouse", "Grenoble", "Nice", "Sophia Antipolis|sophia-antipolis|sophia", "Marseille", "Bordeaux", "Lille", "Nantes", "Rennes", "Strasbourg", "Montpellier", "Massy", "Saclay", "Palaiseau", "Velizy|velizy-villacoublay", "Issy-les-Moulineaux", "Boulogne-Billancourt", "Courbevoie", "La Defense", "Nanterre", "Puteaux", "Saint-Denis", "Tremblay-en-France", "Marignane", "Blagnac", "Colomiers", "Elancourt", "Les Mureaux", "Meudon", "Rueil-Malmaison", "Gennevilliers", "Montreuil", "Clichy", "Levallois-Perret", "Neuilly-sur-Seine", "Guyancourt", "Saint-Quentin-en-Yvelines", "Brest", "Lannion", "Valbonne", "Aix-en-Provence", "Cannes", "Crolles", "Rousset", "Caen", "Tours", "Orleans", "Dijon", "Metz", "Nancy", "Reims", "Rouen", "Le Mans", "Angers", "Clermont-Ferrand", "Saint-Etienne", "Pau", "Bayonne", "Annecy", "Mulhouse"],
  SE: ["Stockholm", "Gothenburg|goteborg|gothenburg", "Malmo|malmoe", "Lund", "Uppsala", "Linkoping|linkoeping", "Vasteras|vaesteraas", "Kista", "Solna", "Sundbyberg", "Umea", "Karlskrona", "Jonkoping", "Norrkoping", "Sodertalje", "Lulea"],
  DK: ["Copenhagen|kobenhavn|koebenhavn", "Aarhus|arhus", "Odense", "Aalborg", "Lyngby|kongens lyngby", "Ballerup", "Billund", "Bagsvaerd|bagsværd", "Kalundborg", "Hillerod|hilleroed"],
  FI: ["Helsinki", "Espoo", "Tampere", "Oulu", "Turku", "Vantaa", "Jyvaskyla", "Lappeenranta"],
  NO: ["Oslo", "Trondheim", "Bergen", "Stavanger", "Fornebu", "Lysaker", "Kongsberg", "Asker", "Sandvika"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville|sevilla", "Malaga", "Bilbao", "Zaragoza", "Getafe", "Alcobendas", "San Sebastian|donostia", "Sant Cugat|sant cugat del valles", "Tres Cantos", "Las Rozas", "Pozuelo de Alarcon", "Granada", "Murcia", "Valladolid", "Vigo", "A Coruna|la coruna", "Gijon", "Oviedo", "Pamplona", "Santander", "Alicante", "Palma"],
  PT: ["Lisbon|lisboa", "Porto", "Braga", "Aveiro", "Coimbra", "Ovar", "Oeiras", "Matosinhos", "Maia", "Guimaraes", "Leiria", "Setubal", "Faro", "Evora"],
  PL: ["Warsaw|warszawa", "Krakow|cracow|krakow", "Wroclaw", "Gdansk", "Poznan", "Lodz", "Katowice", "Gdynia", "Szczecin", "Lublin", "Bialystok", "Rzeszow", "Bydgoszcz", "Torun", "Gliwice", "Bielsko-Biala", "Olsztyn", "Opole", "Kielce", "Sopot"],
  AT: ["Vienna|wien", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach", "Hagenberg", "Leoben", "Dornbirn", "Wels", "Steyr", "St. Polten|st. poelten|sankt polten"],
  BE: ["Brussels|bruxelles|brussel", "Antwerp|antwerpen|anvers", "Ghent|gent|gand", "Leuven|louvain", "Liege|luik", "Mechelen|malines", "Louvain-la-Neuve", "Namur", "Charleroi", "Hasselt", "Kortrijk", "Bruges|brugge", "Mons", "Wavre", "Tienen|tirlemont", "Diegem", "Zaventem", "Vilvoorde", "Machelen", "Herentals", "Geel", "Genk"],
  IT: ["Milan|milano", "Rome|roma", "Turin|torino", "Bologna", "Florence|firenze", "Naples|napoli", "Genoa|genova", "Pisa", "Padua|padova", "Venice|venezia", "Verona", "Trento", "Trieste", "Bari", "Catania", "Palermo", "Cagliari", "Brescia", "Bergamo", "Modena", "Parma", "Pavia", "Ancona", "Perugia", "Pomigliano d'Arco", "Assago", "Agrate Brianza", "Ivrea", "Vimercate", "Sesto San Giovanni", "Cascina Costa", "Varese", "La Spezia", "Taranto", "Brindisi", "Grottaglie", "Frosinone", "Nerviano", "Caselle", "Campi Bisenzio", "Chieti", "L'Aquila", "Pozzuoli", "Lecce", "Monza", "Como", "Lecco", "Udine", "Treviso", "Vicenza", "Reggio Emilia", "Ferrara", "Ravenna", "Rimini", "Siena", "Livorno", "Salerno", "Messina", "Cosenza", "Potenza", "Sassari"],
};

const cityIndex = new Map<string, { city: string; country: Code }>();
for (const [country, list] of Object.entries(cityList) as [Code, string[]][])
  for (const entry of list) {
    const [city, ...other] = entry.split("|");
    for (const n of [city, ...other]) if (!cityIndex.has(fold(n))) cityIndex.set(fold(n), { city, country });
  }

/** A part of a location line as a city, if it is one: "Toulouse Area", "Mnchen Area" from Workday, "Paris 08". */
function asCity(part: string): Place | null {
  const p = fold(part)
    .replace(/\s+(area|region|metropolitan area|office|campus|hq|headquarters|centre|center)$/i, "")
    .replace(/\s+\d+$/, "")
    .replace(/^greater\s+/, "")
    .trim();
  return cityIndex.get(p) ?? null;
}

function asCountry(part: string): Code | null {
  const t = part.trim();
  return byCode.get(t) ?? byName.get(fold(t)) ?? null;
}

function one(location: string): Place | null {
  const parts = location
    .split(/,|\s[-–]\s|\s\/\s/)
    .map((p) => p.trim())
    .filter(Boolean);
  // a country's name wins over a two-letter code, which can be a German state: "Berlin, BE, Germany"
  const named = new Set(parts.map((p) => byName.get(fold(p))).filter((c): c is Code => !!c));
  const countries = named.size ? named : new Set(parts.map((p) => byCode.get(p)).filter((c): c is Code => !!c));
  if (countries.size > 1) return null;
  const cities = parts.map(asCity).filter((c): c is Place => !!c);
  if (!cities.length) {
    // a town that isn't in the list, in a country the line names: the board's own spelling, first part only
    const [country] = [...countries];
    const first = parts[0].replace(/\([^)]*\)/g, "").trim();
    if (!country || asCountry(parts[0]) || /\d|valley|county|region|area|state|province|district/i.test(first) || first.split(" ").length > 4) return null;
    return { city: first, country };
  }
  const city = cities[0];
  // a second city in the line is fine when it is in the same country, like "Milan, Assago"
  if (cities.some((c) => c.country !== city.country)) return null;
  if (countries.size === 1 && !countries.has(city.country)) return null;
  return city;
}

/** One place from a location line, or null when it names several places, none we know, or two countries.
 * "London; London" is one place. */
export function placeOf(location: string): Place | null {
  if (!location || /\d+\s+locations?|multiple locations|remote/i.test(location) || america.test(location)) return null;
  const all = location.split(/[;|]/).map((l) => l.trim()).filter(Boolean);
  const found = all.map(one);
  if (found.some((p) => !p)) return null;
  const [p] = found as Place[];
  return found.every((x) => x!.city === p.city && x!.country === p.country) ? p : null;
}

/** True when two city names are the same place: "Munich" and "München", "Zurich" and "Zurich-Rüschlikon". */
export function sameCity(a: string, b: string): boolean {
  const x = asCity(a);
  const y = asCity(b);
  return x && y ? x.city === y.city && x.country === y.country : fold(a) === fold(b);
}

/** The cities a company entry covers: "Rotterdam, The Hague, Pernis or Amsterdam" is four. */
export function entryCities(city: string): string[] {
  return city
    .replace(/\([^)]*\)/g, "")
    .split(/,| and | or |\//)
    .map((x) => x.trim())
    .filter(Boolean);
}
