"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { levels, type Level } from "@/lib/eligibility";
import { fits, isEmpty, readProfile, writeProfile, type Fit, type Profile } from "@/lib/profile";
import { toast } from "@/lib/toast";
import type { RoleKind } from "@/data/types";

type Country = { code: string; name: string };

const kindOptions: { value: RoleKind; label: string }[] = [
  { value: "Internship", label: "Internships" },
  { value: "Graduate", label: "Graduate roles" },
  { value: "Thesis", label: "Thesis roles" },
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-11 rounded-full border px-4 font-sans text-[15px] ${on ? "border-ink bg-ink font-semibold text-bg" : "border-line bg-surface text-ink hover:border-muted"}`}
    >
      {children}
    </button>
  );
}

const flip = <T,>(list: T[] | undefined, v: T): T[] => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

/** Pick once, and the list, Today and the reminders show the roles that fit. Nothing leaves the browser. */
export default function ProfileForm({ countries, roles }: { countries: Country[]; roles: Fit[] }) {
  const [p, setP] = useState<Profile>({});
  const [had, setHad] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readProfile();
    if (stored) {
      setP(stored);
      setHad(true);
    }
    setReady(true);
  }, []);

  const n = roles.filter((x) => fits(x, p)).length;
  const save = () => {
    writeProfile(p);
    setHad(!isEmpty(p));
    toast(isEmpty(p) ? "Profile cleared" : "Profile saved");
  };
  const clear = () => {
    setP({});
    writeProfile(null);
    setHad(false);
    toast("Profile cleared");
  };

  const section = "mt-7 border-t-2 border-ink pt-3";
  const h = "text-[18px] font-bold";
  const note = "mt-0.5 font-sans text-[14px] text-muted";

  return (
    <div className={ready ? "" : "opacity-60"}>
      <section className={section}>
        <h2 className={h}>Your study level</h2>
        <p className={note}>Roles that name no level stay in.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip on={!p.level} onClick={() => setP({ ...p, level: undefined })}>
            Any
          </Chip>
          {levels.map((l) => (
            <Chip key={l.value} on={p.level === l.value} onClick={() => setP({ ...p, level: l.value as Level })}>
              {l.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className={section}>
        <h2 className={h}>Countries</h2>
        <p className={note}>Pick as many as you like. None picked means all of them.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {countries.map((k) => (
            <Chip key={k.code} on={!!p.countries?.includes(k.code)} onClick={() => setP({ ...p, countries: flip(p.countries, k.code) })}>
              {k.name}
            </Chip>
          ))}
        </div>
      </section>

      <section className={section}>
        <h2 className={h}>What you look for</h2>
        <p className={note}>None picked means all three.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {kindOptions.map((k) => (
            <Chip key={k.value} on={!!p.kinds?.includes(k.value)} onClick={() => setP({ ...p, kinds: flip(p.kinds, k.value) })}>
              {k.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className={section}>
        <h2 className={h}>Visa and language</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip on={!!p.visa} onClick={() => setP({ ...p, visa: !p.visa })}>
            I need a visa
          </Chip>
          <Chip on={!!p.english} onClick={() => setP({ ...p, english: !p.english })}>
            English only
          </Chip>
        </div>
        <p className={note}>
          A visa hides roles that say they don&apos;t sponsor or that you need the right to work there already. English
          only hides roles that ask for another language.
        </p>
      </section>

      <div className="sticky bottom-0 z-10 mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-ink bg-bg py-3 app:bottom-[calc(56px+env(safe-area-inset-bottom))]">
        <p aria-live="polite" className="font-sans text-[15px]">
          <b className="tabular-nums">{n}</b> open {n === 1 ? "role fits" : "roles fit"}
        </p>
        <button type="button" onClick={save} className="flex h-11 items-center rounded-md bg-ink px-5 font-sans text-[15px] font-semibold text-bg hover:bg-muted" data-track="profile-save">
          Save
        </button>
        {had && (
          <>
            <Link href="/" className="flex h-11 items-center font-sans text-[15px] text-link underline underline-offset-2">
              See them in the list
            </Link>
            <button type="button" onClick={clear} className="h-11 font-sans text-[15px] text-muted underline underline-offset-2">
              Clear my profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
