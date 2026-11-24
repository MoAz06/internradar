import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import { links } from "@/data/companies";
import { og } from "@/lib/og";

const blurb = "What internradar collects, where it goes, how long it stays and how to have it removed.";

export const metadata: Metadata = {
  title: "Privacy",
  description: blurb,
  alternates: { canonical: "/privacy/" },
  ...og("Privacy on internradar", blurb, "about", "/privacy/"),
};

const changed = "24 November 2026";

function Contact() {
  return links.contact ? (
    <a href={`mailto:${links.contact}`} className="link">
      {links.contact}
    </a>
  ) : (
    <a href={links.linkedin} className="link">
      a message on LinkedIn
    </a>
  );
}

const h2 = "mt-9 text-lg font-bold";
const p = "mt-3 text-[16px] leading-[1.6] text-muted";
const li = "text-[16px] leading-[1.6] text-muted";

export default function Privacy() {
  return (
    <Section className="pt-10 pb-16 sm:pt-14">
      <div className="max-w-[680px]">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]">Privacy</h1>
        <p className={p}>
          internradar is run by{" "}
          <a href={links.linkedin} className="link">
            Mohamed Azahrioui
          </a>
          , a student in Leiden, the Netherlands. I decide what happens with the data below, so for the GDPR I am
          the one responsible for it. You can reach me with <Contact />.
        </p>
        <p className={p}>
          {`In short: you can use the whole site without telling me who you are. There are no cookies and no accounts. What you save, follow or pick in your profile stays in your browser. I only get something from you when you sign up for an email, send a report or send a suggestion, and then only what you type in.`}
        </p>

        <h2 className={h2}>Visiting the site</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            The site is hosted on GitHub Pages. GitHub logs the IP address of every visit for security, as it does for
            all its pages; see{" "}
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" className="link">
              GitHub&apos;s privacy statement
            </a>
            . I don&apos;t see those logs.
          </li>
          <li className={li}>
            I count visits with{" "}
            <a href="https://www.goatcounter.com/help/privacy" className="link">
              GoatCounter
            </a>
            . It sets no cookies and doesn&apos;t store your IP address. It keeps totals per page: the page, the site you
            came from, browser, operating system, screen width, language and country. I use it to see which pages people
            use. If your browser blocks it, the site works the same.
          </li>
          <li className={li}>The fonts are on internradar.eu itself, so loading a page asks nothing from Google.</li>
        </ul>

        <h2 className={h2}>What stays in your browser</h2>
        <p className={p}>
          {`Saved roles, the steps you track on My applications, the companies you follow, your profile, the theme and how many roles a page shows are kept in your browser's local storage. Nothing of it is sent to me. Clearing the site's data in your browser removes it. The link on My applications that moves your list to another device carries the list in the link itself; it isn't stored anywhere.`}
        </p>
        <p className={p}>
          {`If you install the app and turn on reminders, your browser fetches the list of deadlines from internradar.eu now and then and works out itself which ones to remind you of. There is no push server and I don't know who turned reminders on.`}
        </p>

        <h2 className={h2}>The email</h2>
        <p className={p}>
          {`If you sign up for the email, your email address goes to Buttondown, the service that sends the weekly email, together with the edition you pick if the form asks for one. Buttondown is a company in the United States, so your address is stored there. Buttondown also records technical details such as your IP address and can see whether an email was opened. I use your address only to send the weekly email. Every email has a link to unsubscribe; after that you get nothing more. You can also ask me to delete your address. Buttondown's own terms are in `}
          <a href="https://buttondown.com/legal/privacy" className="link">
            its privacy policy
          </a>
          .
        </p>

        <h2 id="company-alerts" className={h2}>
          Emails about one company
        </h2>
        <p className={p}>
          {`On a company page you can ask for an email when that company opens a role. The form sends your email address and the company to the same Cloudflare Worker and Turnstile check as the share form. The Worker keeps your address and the companies you picked in Cloudflare's storage, under a code made from your address, and sends you one email to confirm. Nothing else is sent until you click that link. A request nobody confirms is deleted after a week.`}
        </p>
        <p className={p}>
          {`After you confirm, you get an email on the mornings one of your companies has a new role or opens one. The emails go out through Resend, a company in the United States that sends email. Every email has a link to stop one company and a link to stop all of them; when you stop the last one, your address is deleted. I use your address only for these emails. Cloudflare's and Resend's own terms are in their privacy policies.`}
        </p>

        <h2 id="suggestions" className={h2}>
          Suggestions
        </h2>
        <p className={p}>
          {`The suggestion form asks only for your suggestion, and your email address if you want an answer. It goes through the same Cloudflare Worker and Turnstile check as the share form, and then Resend, a company in the United States that sends email, delivers it to my inbox as one email. The Worker keeps nothing; what Resend keeps is in its own privacy policy. I use your address only to answer you, and you can ask me to delete the email.`}
        </p>

        <h2 className={h2}>Sharing your hiring process</h2>
        <p className={p}>
          {`The share form asks no name and no email. What you type goes to a small Cloudflare Worker, which checks with Cloudflare Turnstile that you are not a bot and then puts your answers in a private GitHub repository that only I can read. Turnstile looks at your IP address and browser to do that check. The Worker itself keeps nothing.`}
        </p>
        <p className={p}>
          {`I read every report before anything goes on the site, and I take out anything that could tell who you are. What goes on the company page is the role, the month, the steps and the outcome, without a name. Please don't put your name or contact details in the notes. Want a report taken off the site or out of the inbox? Send me the company, the role and the month and I'll remove it.`}
        </p>
        <p className={p}>
          {`The "Something wrong?" links and the GitHub form open an issue on GitHub. Those are public and carry your GitHub username, like any GitHub issue.`}
        </p>

        <h2 className={h2}>Why I may do this</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>The emails and the reports: because you asked for them or sent them, with your consent. You can take it back at any time.</li>
          <li className={li}>The visit count and the bot check: my legitimate interest in knowing which pages are used and keeping spam out, with as little data as I can.</li>
        </ul>

        <h2 className={h2}>How long</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>Your email address: until you unsubscribe or ask me to delete it. For the company emails: until you stop the last company, or a week if you never confirm.</li>
          <li className={li}>A report: as long as it is useful on the site, or until you ask me to remove it.</li>
          <li className={li}>Visit totals: kept as totals, without anything that points to you.</li>
        </ul>

        <h2 className={h2}>Your rights</h2>
        <p className={p}>
          You can ask me what I have about you, to correct it, to delete it, or to stop using it. Send it to <Contact />{" "}
          and I&apos;ll answer within a month. Not happy with the answer? You can complain to the Dutch data protection
          authority, the{" "}
          <a href="https://autoriteitpersoonsgegevens.nl/en" className="link">
            Autoriteit Persoonsgegevens
          </a>
          .
        </p>

        <p className="mt-9 font-sans text-[14px] text-dim">
          Last changed {changed}. When this page changes, the date changes too. See also{" "}
          <Link href="/about/" className="link">
            About
          </Link>
          .
        </p>
      </div>
    </Section>
  );
}
