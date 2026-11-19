// The text of one posting, from the job board's own API. "" when it can't be read.
// Used by the nightly drafts and by the run that puts roles straight on the list.

import type { Board, Found } from "./boards.ts";
import { json } from "./fetchGently.ts";
import { htmlToText } from "./roleDraft.ts";


const ashbyBoards = new Map<string, Promise<{ jobs: { id: string; descriptionPlain?: string; descriptionHtml?: string }[] } | null>>();

export async function postingText(f: Found): Promise<string> {
  const b: Board = f.spec;
  if (b.ats === "greenhouse") {
    const d = await json<{ content?: string }>(`https://boards-api.greenhouse.io/v1/boards/${b.board}/jobs/${f.ref}`);
    return d?.content ? htmlToText(d.content) : "";
  }
  if (b.ats === "lever") {
    // the HTML, not the plain text: the plain text loses which lines are a list
    const d = await json<{ description?: string; lists?: { text: string; content: string }[]; additional?: string }>(
      `https://api${b.eu ? ".eu" : ""}.lever.co/v0/postings/${b.board}/${f.ref}`,
    );
    if (!d) return "";
    return [htmlToText(d.description ?? ""), ...(d.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`), htmlToText(d.additional ?? "")].join("\n");
  }
  if (b.ats === "ashby") {
    if (!ashbyBoards.has(b.board)) ashbyBoards.set(b.board, json(`https://api.ashbyhq.com/posting-api/job-board/${b.board}`));
    const j = (await ashbyBoards.get(b.board))?.jobs.find((x) => x.id === f.ref);
    return j ? (j.descriptionHtml ? htmlToText(j.descriptionHtml) : (j.descriptionPlain ?? "")) : "";
  }
  if (b.ats === "smartrecruiters") {
    const d = await json<{ jobAd?: { sections?: Record<string, { title?: string; text?: string }> } }>(
      `https://api.smartrecruiters.com/v1/companies/${b.board}/postings/${f.ref}`,
    );
    return Object.values(d?.jobAd?.sections ?? {})
      .map((s) => `${s.title ?? ""}\n${htmlToText(s.text ?? "")}`)
      .join("\n");
  }
  if (b.ats === "amazon") {
    // the job page is a web app; the search finds the job by its number and carries the whole text
    const d = await json<{ jobs: { id_icims: string; description?: string; basic_qualifications?: string; preferred_qualifications?: string }[] }>(
      `https://www.amazon.jobs/en/search.json?base_query=${f.ref}&result_limit=5`,
    );
    const j = d?.jobs.find((x) => x.id_icims === f.ref);
    return j
      ? [j.description, `Basic qualifications\n${j.basic_qualifications ?? ""}`, `Preferred qualifications\n${j.preferred_qualifications ?? ""}`].map((s) => htmlToText(s ?? "")).join("\n")
      : "";
  }
  if (b.ats === "oracle") {
    const d = await json<{ items: Record<string, string | undefined>[] }>(
      `${b.origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%22${f.ref}%22,siteNumber=${b.site}`,
    );
    const j = d?.items?.[0];
    return j
      ? ["ExternalDescriptionStr", "ExternalResponsibilitiesStr", "ExternalQualificationsStr"].map((k) => htmlToText(j[k] ?? "")).join("\n")
      : "";
  }
  if (b.ats === "eightfold") {
    const d = await json<{ data?: { jobDescription?: string } }>(`${b.origin}/api/pcsx/position_details?position_id=${f.ref}&domain=${b.domain}`);
    return d?.data?.jobDescription ? htmlToText(d.data.jobDescription) : "";
  }
  const d = await json<{ jobPostingInfo?: { jobDescription?: string } }>(`${b.origin}/wday/cxs/${b.tenant}/${b.site}${f.ref}`);
  return d?.jobPostingInfo?.jobDescription ? htmlToText(d.jobPostingInfo.jobDescription) : "";
}

