import { links } from "@/data/companies";

/** The Buttondown sign-up form: one field and a button. Renders nothing while there is no newsletter. */
export default function EmailSignup({ id, track, className = "" }: { id: string; track: string; className?: string }) {
  if (!links.newsletter) return null;
  return (
    <form
      action={`https://buttondown.com/api/emails/embed-subscribe/${links.newsletter}`}
      method="post"
      target="_blank"
      className={`flex max-w-[460px] gap-2 ${className}`}
      data-track={track}
    >
      <label htmlFor={id} className="sr-only">
        Your email
      </label>
      <input
        id={id}
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="min-w-0 flex-1 border border-line bg-surface px-3 py-2 text-[16px]"
      />
      <button type="submit" className="bg-ink px-4 py-2 text-[15px] font-semibold text-white hover:bg-muted">
        Sign up
      </button>
    </form>
  );
}
