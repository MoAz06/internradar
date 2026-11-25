import { boardOf, early, techTitle, inEurope } from "./lib/boards.ts";
import { readBoard } from "./lib/readBoard.ts";
await Promise.all(process.argv.slice(2).map(async (u) => {
  const b = boardOf(u); if (!b) { console.log("NOBOARD", u); return; }
  try {
    const l = await readBoard(b);
    if (!l) { console.log("NULL", u); return; }
    const hit = l.filter(x => early.test(x.title) && techTitle(x.title) && inEurope(x.location));
    console.log(`${u}  total=${l.length} hits=${hit.length}`);
    for (const h of hit.slice(0, 15)) console.log("   ", h.title, "|", h.location, "|", h.url);
  } catch (e) { console.log("ERR", u, String(e).slice(0, 80)); }
}));
