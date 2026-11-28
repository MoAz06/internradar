// Tells the search engines on IndexNow (Bing, which also feeds ChatGPT search, Copilot and DuckDuckGo; Yandex;
// Naver; Seznam) which pages changed tonight. Needs INDEXNOW_KEY, the same key the site serves at /indexnow.txt,
// so they can check the ping comes from this site. One request carries every changed page. `--dry` prints
// the list and sends nothing.

import { changedPages, site } from "../lib/indexing.ts";
import { today } from "../lib/live.ts";

const dry = process.argv.includes("--dry");
const key = process.env.INDEXNOW_KEY;

async function main() {
  const { updated, deleted, lists } = changedPages(today());
  const urlList = [...new Set([...lists, ...updated, ...deleted])];
  console.log(`${urlList.length} pages: ${lists.length} list pages, ${updated.length} new or opened roles, ${deleted.length} closed roles`);
  if (dry) {
    for (const u of urlList) console.log(u);
    return;
  }
  if (!key) {
    console.log("INDEXNOW_KEY is not set, nothing sent.");
    return;
  }
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "internradar.eu", key, keyLocation: `${site}/indexnow.txt`, urlList: urlList.slice(0, 10000) }),
  });
  console.log(`IndexNow answered ${res.status}${res.ok ? "" : `: ${(await res.text()).slice(0, 200)}`}`);
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
