"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { readSaved, SAVED_EVENT, writeSaved } from "@/lib/mine";
import { toast } from "@/lib/toast";

/** Save or unsave one role on its own page. The list keeps its own state; this one follows the saved list. */
export default function SaveButton({ id, label }: { id: string; label: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const read = () => setSaved(readSaved().includes(id));
    read();
    window.addEventListener(SAVED_EVENT, read);
    return () => window.removeEventListener(SAVED_EVENT, read);
  }, [id]);

  const flip = (quiet = false) => {
    const now = readSaved();
    const on = !now.includes(id);
    writeSaved(on ? [...now, id] : now.filter((s) => s !== id));
    setSaved(on);
    if (!quiet) toast(on ? "Saved to your list" : "Removed from your list", () => flip(true));
  };

  return (
    <button
      type="button"
      onClick={() => flip()}
      aria-pressed={saved}
      data-track={saved ? "unsave" : "save"}
      className={`flex h-11 items-center gap-2 rounded-md border px-4 font-sans text-[15px] font-semibold ${
        saved ? "border-accent bg-accent text-bg" : "border-ink text-ink hover:bg-raised"
      }`}
    >
      <Icon name="bookmark" filled={saved} className="h-[18px] w-[18px]" />
      {saved ? "Saved" : "Save"}
      <span className="sr-only"> {label}</span>
    </button>
  );
}
