"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** "Suggest something" with the page it sits on, so a suggestion says where it came from. A click inside the site
 * leaves document.referrer as it was, so the form can't find the page on its own. */
export default function FeedbackLink({ className = "" }: { className?: string }) {
  const path = usePathname();
  const from = path && !path.startsWith("/feedback") ? `?from=${encodeURIComponent(path)}` : "";
  return (
    <Link href={`/feedback/${from}`} className={className}>
      Suggest something
    </Link>
  );
}
