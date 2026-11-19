import { links } from "@/data/companies";
import { editions } from "@/lib/mailEdition";

/** The Buttondown sign-up form: which edition, the address and a button. The edition goes to Buttondown as a tag,
 * so each reader only gets the email for their country (scripts/mail-edition.mts). Renders nothing while there is no newsletter. */
export default function EmailSignup({ id, track, edition = "All of Europe", className = "" }: { id: string; track: string; edition?: string; className?: string }) {
  if (!links.newsletter) return null;
  return (
    <form
      action={`https://buttondown.com/api/emails/embed-subscribe/${links.newsletter}`}
      method="post"
      target="_blank"
      className={`max-w-[460px] ${className}`}
      data-track={track}
    >
      <label htmlFor={`${id}-edition`} className="text-[14px] text-muted">
        Edition
      </label>
      <select
        id={`${id}-edition`}
        name="tag"
        defaultValue={edition}
        className="mt-1 block min-h-11 w-full border border-line bg-surface px-3 py-2 text-[16px]"
      >
        {editions.map((e) => (
          <option key={e.code} value={e.tag}>
            {e.tag}
          </option>
        ))}
      </select>
      <div className="mt-2 flex gap-2">
        <label htmlFor={id} className="sr-only">
          Your email
        </label>
        <input
          id={id}
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="min-h-11 min-w-0 flex-1 border border-line bg-surface px-3 py-2 text-[16px]"
        />
        <button type="submit" className="min-h-11 bg-ink px-4 py-2 text-[15px] font-semibold text-bg hover:bg-muted">
          Sign up
        </button>
      </div>
    </form>
  );
}
