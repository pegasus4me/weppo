import { readFileSync, writeFileSync, existsSync } from "node:fs";

const COMPANIES_FILE = "outputs/yc_companies.json";
const OUT_FILE = "outputs/yc_domains.json";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const DELAY_MS = Number(process.env.DELAY_MS ?? 900);

const companies = JSON.parse(readFileSync(COMPANIES_FILE, "utf8"));
const results = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : {};
const done = new Set(Object.keys(results));

function extractWebsite(html) {
  const m = html.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*aria-label="Company website"/);
  if (m) return m[1];
  const m2 = html.match(/aria-label="Company website"[^>]*href="(https?:\/\/[^"]+)"/);
  if (m2) return m2[1];
  return null;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pending = companies.filter((c) => !done.has(c.companyId));
console.log(`Total: ${companies.length}, already fetched: ${done.size}, pending: ${pending.length}`);

let i = 0;
for (const c of pending) {
  i++;
  try {
    const res = await fetch(c.ycUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok) {
      results[c.companyId] = { slug: c.slug, name: c.name, website: null, status: `http_${res.status}` };
    } else {
      const html = await res.text();
      const website = extractWebsite(html);
      results[c.companyId] = {
        slug: c.slug,
        name: c.name,
        website,
        domain: website ? hostnameOf(website) : null,
        status: website ? "ok" : "no_website_link",
      };
    }
  } catch (e) {
    results[c.companyId] = { slug: c.slug, name: c.name, website: null, status: `error: ${String(e).slice(0, 80)}` };
  }

  if (i % 25 === 0 || i === pending.length) {
    writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    const ok = Object.values(results).filter((r) => r.domain).length;
    console.log(`[${i}/${pending.length}] saved. Domains found so far: ${ok}`);
  }
  await sleep(DELAY_MS);
}

writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
const ok = Object.values(results).filter((r) => r.domain).length;
console.log(`Done. Domains found: ${ok}/${companies.length}`);
