import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT_FILE = "outputs/yc_company_desc.json";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const DELAY_MS = Number(process.env.DELAY_MS ?? 800);

const rows = JSON.parse(readFileSync("outputs/weppo_outreach_final.csv", "utf8").split("\n").slice(1).join("\n").length === 0 ? "[]" : "[]"); // placeholder not used

// Get unique companies from outreach emails json filtered by sendable list
const emailsRows = JSON.parse(readFileSync("outputs/yc_outreach_emails.json", "utf8"));
const verified = JSON.parse(readFileSync("outputs/yc_emails_verified.json", "utf8"));
const verdicts = JSON.parse(readFileSync("outputs/yc_company_verdicts.json", "utf8"));

const companiesAll = JSON.parse(readFileSync("outputs/yc_companies.json", "utf8"));
const byId = new Map(companiesAll.map((c) => [c.companyId, c]));

// unique companies present in final csv
const fs = await import("node:fs");
const finalCsv = fs.readFileSync("outputs/weppo_outreach_final.csv", "utf8");
const targetEmails = new Set(finalCsv.split("\n").slice(1).map((l) => l.split(",")[0]));

const targets = new Map();
for (const r of emailsRows) {
  if (!r.email_primary || !targetEmails.has(r.email_primary)) continue;
  if (!targets.has(r.companyId)) {
    const full = byId.get(r.companyId);
    targets.set(r.companyId, { companyId: r.companyId, slug: full?.slug, name: r.company });
  }
}

console.log(`Companies to scrape: ${targets.size}`);

const results = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let i = 0;
for (const c of targets.values()) {
  if (results[c.companyId]) continue;
  if (!c.slug) {
    results[c.companyId] = { name: c.name, error: "no_slug" };
    continue;
  }
  i++;
  try {
    const res = await fetch(`https://www.ycombinator.com/companies/${c.slug}`, {
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    if (!res.ok) {
      results[c.companyId] = { slug: c.slug, name: c.name, error: `http_${res.status}` };
    } else {
      const html = await res.text();
      const m = html.match(/<meta content="([^"]+)" name="description"/);
      const desc = m ? m[1] : null;
      // team size + location often inside desc; also try og:description fallback
      let teamSize = null;
      const ts = html.match(/has (\d+) employees/i);
      if (ts) teamSize = Number(ts[1]);
      results[c.companyId] = { slug: c.slug, name: c.name, description: desc, teamSize };
    }
  } catch (e) {
    results[c.companyId] = { slug: c.slug, name: c.name, error: String(e).slice(0, 80) };
  }
  if (i % 25 === 0) {
    writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    console.log(`[${i}] saved (${Object.keys(results).length}/${targets.size})`);
  }
  await sleep(DELAY_MS);
}
writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
console.log("Done:", Object.keys(results).length);
