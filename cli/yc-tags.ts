import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT_FILE = "outputs/yc_company_tags.json";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const DELAY_MS = Number(process.env.DELAY_MS ?? 800);

// Map companyId -> slug using domains file (has slug) or companies file
const companiesAll = JSON.parse(readFileSync("outputs/yc_companies.json", "utf8"));
const byId = new Map(companiesAll.map((c) => [c.companyId, c]));
const pendingCompanies = JSON.parse(readFileSync("outputs/yc_pending_companies.json", "utf8"));

const results = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let i = 0;
for (const c of pendingCompanies) {
  if (results[c.companyId]) continue;
  const full = byId.get(c.companyId);
  const slug = full?.slug;
  if (!slug) {
    results[c.companyId] = { name: c.name, tags: [], error: "no_slug" };
    continue;
  }
  i++;
  try {
    const res = await fetch(`https://www.ycombinator.com/companies/${slug}`, {
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    if (!res.ok) {
      results[c.companyId] = { slug, name: c.name, tags: [], error: `http_${res.status}` };
    } else {
      const html = await res.text();
      const tags = [...new Set([...html.matchAll(/href="\/companies\/industry\/([^"]+)"/g)].map((m) => m[1]))];
      // Also grab team size if present
      results[c.companyId] = { slug, name: c.name, tags };
    }
  } catch (e) {
    results[c.companyId] = { slug, name: c.name, tags: [], error: String(e).slice(0, 80) };
  }
  if (i % 25 === 0) {
    writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    console.log(`[${i}] saved (${Object.keys(results).length}/${pendingCompanies.length})`);
  }
  await sleep(DELAY_MS);
}
writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
console.log("Done:", Object.keys(results).length);
