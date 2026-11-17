import { nextDay, type CalEvent } from "./ics.ts";

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

/** Links that put one all-day event in a calendar: Google and Outlook on the web, or the .ics file for the rest. */
export function eventLinks(e: CalEvent, file: string) {
  const enc = encodeURIComponent;
  const end = nextDay(e.date);
  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(e.summary)}&dates=${e.date.replace(/-/g, "")}/${end.replace(/-/g, "")}&details=${enc(e.description)}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${enc(e.summary)}&startdt=${e.date}&enddt=${end}&allday=true&body=${enc(e.description)}`,
    file,
  };
}
