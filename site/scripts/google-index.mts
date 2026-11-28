// Tells Google which role pages changed tonight, through the Indexing API it offers for pages with JobPosting
// markup. Needs GOOGLE_INDEXING_KEY: the JSON key of a service account that is an owner of the site in Search
// Console. Google allows about 200 notifications a day: roles that closed go first, then roles that came on or
// opened, and the rest of the day's room goes to a slice of all open roles, a different slice each day, so every
// page gets a fresh look about once a week. `--dry` prints the plan and sends nothing.

import { createSign } from "node:crypto";
import { changedPages } from "../lib/indexing.ts";
import { today } from "../lib/live.ts";

const LIMIT = 190;
const dry = process.argv.includes("--dry");
const key = process.env.GOOGLE_INDEXING_KEY;

type Notification = { url: string; type: "URL_UPDATED" | "URL_DELETED" };

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** A one-hour token for the Indexing API, signed with the service account's key (a JWT bearer grant). */
async function accessToken(account: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/indexing", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(account.private_key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export function plan(now: string, limit = LIMIT): Notification[] {
  const { updated, deleted, open } = changedPages(now);
  const batch: Notification[] = [];
  for (const url of deleted) batch.push({ url, type: "URL_DELETED" });
  for (const url of updated) batch.push({ url, type: "URL_UPDATED" });
  const rest = open.filter((u) => !updated.includes(u));
  const room = Math.max(0, limit - batch.length);
  if (room > 0 && rest.length > 0) {
    const slices = Math.ceil(rest.length / room);
    const slice = Math.floor(Date.parse(now) / 86_400_000) % slices;
    for (const url of rest.slice(slice * room, (slice + 1) * room)) batch.push({ url, type: "URL_UPDATED" });
  }
  return batch.slice(0, limit);
}

async function main() {
  const now = today();
  const batch = plan(now);
  const closed = batch.filter((b) => b.type === "URL_DELETED").length;
  console.log(`${batch.length} notifications for ${now}: ${closed} closed, ${batch.length - closed} open or new`);
  if (dry) {
    for (const b of batch) console.log(b.type, b.url);
    return;
  }
  if (!key) {
    console.log("GOOGLE_INDEXING_KEY is not set, nothing sent.");
    return;
  }
  const token = await accessToken(JSON.parse(key));
  let sent = 0;
  let failed = 0;
  for (const b of batch) {
    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    if (res.ok) {
      sent++;
      continue;
    }
    failed++;
    if (failed <= 5) console.log(`${res.status} ${b.url}: ${(await res.text()).slice(0, 200)}`);
    // the day's quota is gone; the rest comes round in a later slice
    if (res.status === 429) break;
  }
  console.log(`sent ${sent}, failed ${failed}`);
}

if (process.argv[1]?.endsWith("google-index.mts")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
