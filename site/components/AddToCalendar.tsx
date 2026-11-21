import { eventLinks } from "@/lib/calendarLinks";
import type { CalEvent } from "@/lib/ics";

/** "Add to calendar" with a small menu: Google, Outlook, or the .ics file for Apple and the rest.
 * Plain HTML (details), so it works on static pages and inside the role table. */
export default function AddToCalendar({
  events,
  file,
  align = "left",
  className = "",
  tall = false,
}: {
  events: CalEvent[];
  file: string;
  align?: "left" | "right";
  className?: string;
  /** 44 px high on phones, for a row of links meant for a finger */
  tall?: boolean;
}) {
  const e = events[0];
  if (!e) return null;
  const l = eventLinks(e, file);
  return (
    <details className={`relative ${className}`}>
      <summary
        className={`${tall ? "flex min-h-11 items-center sm:min-h-0" : "inline"} cursor-pointer list-none text-muted underline underline-offset-2 hover:text-ink [&::-webkit-details-marker]:hidden`}
      >
        Add to calendar
        <span className="sr-only">: {e.summary}</span>
      </summary>
      <ul
        className={`absolute top-full z-20 mt-1 w-max border border-line bg-surface px-3 py-1.5 text-[14px] whitespace-nowrap shadow-sm ${
          align === "right" ? "left-0 md:right-0 md:left-auto" : "left-0"
        }`}
      >
        <li>
          <a href={l.google} target="_blank" rel="noreferrer" className="link block py-1" data-track="calendar-google">
            Google Calendar
          </a>
        </li>
        <li>
          <a href={l.outlook} target="_blank" rel="noreferrer" className="link block py-1" data-track="calendar-outlook">
            Outlook
          </a>
        </li>
        <li>
          <a href={l.file} download className="link block py-1" data-track="calendar-ics">
            Apple or other (.ics)
          </a>
        </li>
      </ul>
    </details>
  );
}
