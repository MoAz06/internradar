"use client";

import { useEffect, useRef, useState } from "react";
import QuickShare from "@/components/QuickShare";
import ShareForm, { type FormCountry } from "@/components/ShareForm";

type Props = { countries: FormCountry[]; endpoint: string; siteKey: string; githubForm: string };

/** The quick form first; the full one, with dates and notes, one tap away. #full opens that one. */
export default function ShareTabs(props: Props) {
  const [tab, setTab] = useState<"quick" | "full">("quick");
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.hash === "#full") setTab("full");
  }, []);

  const toFull = () => {
    setTab("full");
    top.current?.scrollIntoView();
  };
  const tabClass = (on: boolean) =>
    `h-11 flex-1 rounded-full px-4 font-sans text-[15px] sm:flex-none ${on ? "bg-ink font-semibold text-bg" : "text-ink hover:bg-raised"}`;

  return (
    <div ref={top} className="scroll-mt-20">
      <div role="tablist" aria-label="Which form" className="mb-5 flex gap-1 rounded-full border border-line bg-surface p-0.5 sm:inline-flex">
        <button type="button" role="tab" aria-selected={tab === "quick"} onClick={() => setTab("quick")} className={tabClass(tab === "quick")}>
          Quick, one minute
        </button>
        <button type="button" role="tab" aria-selected={tab === "full"} onClick={() => setTab("full")} className={tabClass(tab === "full")}>
          Full timeline
        </button>
      </div>
      {tab === "quick" ? <QuickShare {...props} onFull={toFull} /> : <ShareForm {...props} />}
    </div>
  );
}
