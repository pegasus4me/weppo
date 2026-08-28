import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Load .env manually
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const API_KEY = process.env.MILLIONVERIFIER_API_KEY;
if (!API_KEY) {
  console.error("Missing MILLIONVERIFIER_API_KEY in cli/.env");
  process.exit(1);
}

const LIMIT = Number(process.env.VERIFY_LIMIT ?? 500);
const DELAY_MS = Number(process.env.DELAY_MS ?? 250);

const rows: any[] = JSON.parse(readFileSync("outputs/yc_outreach_emails.json", "utf8"));
const toVerify = rows.filter((r) => r.email_primary).slice(0, LIMIT);

const OUT_FILE = "outputs/yc_emails_verified.json";
const results: Record<string, any> = existsSync(OUT_FILE)
  ? JSON.parse(readFileSync(OUT_FILE, "utf8"))
  : {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let done = 0;
for (const r of toVerify) {
  if (results[r.email_primary]) continue; // resume support
  try {
    const url = `https://api.millionverifier.com/api/v3/?api=${API_KEY}&email=${encodeURIComponent(r.email_primary)}&timeout=10`;
    const res = await fetch(url);
    const data = await res.json();
    results[r.email_primary] = {
      resultcode: data.resultcode,
      result: data.result,
      quality: data.quality,
      free: data.free,
      verified_at: new Date().toISOString(),
    };
    done++;
    if (done % 25 === 0 || done === toVerify.length) {
      writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
      const valid = Object.values(results).filter((v: any) => v.resultcode === 1).length;
      console.log(`[${done}/${toVerify.length}] saved — valid so far: ${valid}`);
    }
  } catch (e) {
    results[r.email_primary] = { result: "error", detail: String(e).slice(0, 100) };
    console.error(`Error on ${r.email_primary}:`, String(e).slice(0, 100));
  }
  await sleep(DELAY_MS);
}

writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));

// Merge verification back into a final CSV
const counts: Record<string, number> = {};
const merged = rows.map((r) => {
  const v = r.email_primary ? results[r.email_primary] : undefined;
  const verdict = v ? v.result ?? "error" : "";
  if (verdict) counts[verdict] = (counts[verdict] ?? 0) + 1;
  return {
    ...r,
    email_status: verdict,
    email_quality: v?.quality ?? "",
  };
});

function esc(s: any) {
  const str = String(s ?? "");
  return `"${str.replace(/"/g, '""')}"`;
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

console.log("\n=== VERIFICATION SUMMARY ===");
console.log(counts);
console.log(`\nWrote outputs/yc_emails_verified.json + outputs/yc_outreach_verified.csv`);
