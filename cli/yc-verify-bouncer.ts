import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Load .env manually
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const API_KEY = process.env.BOUNCER_API_KEY;
if (!API_KEY) {
  console.error("Missing BOUNCER_API_KEY in cli/.env");
  process.exit(1);
}

const LIMIT = Number(process.env.BOUNCE_LIMIT ?? 1000);
const DELAY_MS = Number(process.env.DELAY_MS ?? 300);

const rows: any[] = JSON.parse(readFileSync("outputs/yc_outreach_emails.json", "utf8"));
const verified: Record<string, any> = existsSync("outputs/yc_emails_verified.json")
  ? JSON.parse(readFileSync("outputs/yc_emails_verified.json", "utf8"))
  : {};

// Skip companies dropped by B2B/SaaS filter
const verdicts: Record<string, string> = existsSync("outputs/yc_company_verdicts.json")
  ? JSON.parse(readFileSync("outputs/yc_company_verdicts.json", "utf8"))
  : {};
const isDropped = (companyId: string) => String(verdicts[companyId] ?? "").startsWith("drop:");

const toVerify = rows
  .filter((r) => r.email_primary && !verified[r.email_primary] && !isDropped(r.companyId))
  .slice(0, LIMIT);
console.log(`Pending total: ${rows.filter((r) => r.email_primary && !verified[r.email_primary]).length}, after B2B filter: ${rows.filter((r) => r.email_primary && !verified[r.email_primary] && !isDropped(r.companyId)).length}, verifying now: ${toVerify.length}`);

function normalize(data: any): { result: string; detail?: string } {
  const s = data.status;
  if (s === "deliverable") return { result: "ok" };
  if (s === "undeliverable") return { result: "invalid", detail: data.reason };
  if (s === "risky") {
    if (data.domain?.acceptAll === "yes") return { result: "catch_all", detail: data.reason };
    return { result: "risky", detail: data.reason ?? "low_quality" };
  }
  return { result: "unknown", detail: data.reason };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let done = 0;
for (const r of toVerify) {
  try {
    const res = await fetch(
      `https://api.usebouncer.com/v1.1/email/verify?email=${encodeURIComponent(r.email_primary)}&timeout=10`,
      { headers: { "x-api-key": API_KEY } }
    );
    const data = await res.json();
    if (data.status === 401 || data.error) {
      console.error(`API error on ${r.email_primary}:`, JSON.stringify(data).slice(0, 120));
      break;
    }
    const n = normalize(data);
    verified[r.email_primary] = {
      result: n.result,
      detail: n.detail,
      provider: "bouncer",
      score: data.score,
      free: data.domain?.free === "yes",
      verified_at: new Date().toISOString(),
    };
    done++;
    if (done % 25 === 0 || done === toVerify.length) {
      writeFileSync("outputs/yc_emails_verified.json", JSON.stringify(verified, null, 2));
      console.log(`[${done}/${toVerify.length}] saved`);
    }
  } catch (e) {
    console.error(`Error on ${r.email_primary}:`, String(e).slice(0, 100));
    await sleep(1000);
  }
  await sleep(DELAY_MS);
}

writeFileSync("outputs/yc_emails_verified.json", JSON.stringify(verified, null, 2));

// Merge into final CSV
const counts: Record<string, number> = {};
const merged = rows.map((r) => {
  const v = r.email_primary ? verified[r.email_primary] : undefined;
  const verdict = v ? v.result ?? "" : "";
  if (verdict) counts[verdict] = (counts[verdict] ?? 0) + 1;
  return { ...r, email_status: verdict, email_quality: v?.score ?? "" };
});

function esc(s: any) {
  return `"${String(s ?? "").replace(/"/g, '""')}"`;
}
const header =
  "company_id,company,founder,title,batch,linkedin,email_primary,email_alternates,email_status,email_quality";
const csv = [
  header,
  ...merged.map((r) =>
    [r.companyId, esc(r.company), esc(r.founder), esc(r.title), r.batch, r.linkedin, r.email_primary, esc(r.email_alternates), r.email_status, r.email_quality].join(",")
  ),
].join("\n");
writeFileSync("outputs/yc_outreach_verified.csv", csv);

console.log("\n=== TOTALS (all providers) ===");
console.log(counts);
console.log(`Verified total: ${Object.keys(verified).length}`);
