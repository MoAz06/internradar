const site = "https://internradar.eu";

/** Subscribe links for a calendar file on the site, e.g. "/deadlines.ics". */
export function calendarLinks(path: string, name = "internradar") {
  const https = `${site}${path}`;
  const webcal = https.replace(/^https:/, "webcal:");
  return {
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
    apple: webcal,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent(name)}`,
    file: path,
  };
}
