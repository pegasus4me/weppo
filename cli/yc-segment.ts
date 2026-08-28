import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { parse } from "node:path";

const CSV_PATH = process.argv[2] ?? "/Users/user/Downloads/yc_startups_full_2024_2025_founders.csv";
const OUT_DIR = "outputs";
mkdirSync(OUT_DIR, { recursive: true });

function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

function slugifyDomain(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const raw = readFileSync(CSV_PATH, "utf8").trim().split("\n");
const header = parseCsvLine(raw[0]);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

const companies = new Map();
const founders = [];

for (let i = 1; i < raw.length; i++) {
  const f = parseCsvLine(raw[i]);
  const row = {
    companyId: f[idx.company_id],
    slug: f[idx.company_slug],
    name: f[idx.company_name],
    batch: f[idx.batch],
    batchYear: f[idx.batch_year],
    founderName: f[idx.founder_name],
    founderTitle: f[idx.founder_title],
    ycUrl: f[idx.yc_company_url],
    linkedinUrl: f[idx.linkedin_url],
    linkedinStatus: f[idx.linkedin_match_status],
  };
  if (!companies.has(row.companyId)) {
    companies.set(row.companyId, {
      companyId: row.companyId,
      slug: row.slug,
      name: row.name,
      batch: row.batch,
      batchYear: row.batchYear,
      ycUrl: row.ycUrl,
      website: null,
      guessedDomains: [
        `${slugifyDomain(row.name)}.com`,
        `${slugifyDomain(row.name)}.ai`,
        `${slugifyDomain(row.name)}.io`,
      ],
    });
  }
  founders.push(row);
}

writeFileSync(`${OUT_DIR}/yc_companies.json`, JSON.stringify([...companies.values()], null, 2));
writeFileSync(`${OUT_DIR}/yc_founders.json`, JSON.stringify(founders, null, 2));

// CSV summary
const byBatch = {};
for (const c of companies.values()) {
  byBatch[c.batch] = (byBatch[c.batch] ?? 0) + 1;
}
console.log(`Companies: ${companies.size}`);
console.log(`Founders: ${founders.length}`);
console.log(`With LinkedIn: ${founders.filter((f) => f.linkedinUrl).length}`);
console.log("By batch:", byBatch);

// Also write a simple CSV of companies for review
const csvHeader = "company_id,slug,name,batch,batch_year,guessed_domain_1,guessed_domain_2,guessed_domain_3";
const csvRows = [...companies.values()].map(
  (c) =>
    `${c.companyId},${c.slug},"${c.name.replace(/"/g, '""')}",${c.batch},${c.batchYear},${c.guessedDomains.join(",")}`
);
writeFileSync(`${OUT_DIR}/yc_companies.csv`, [csvHeader, ...csvRows].join("\n"));
console.log(`\nWrote ${OUT_DIR}/yc_companies.json, yc_founders.json, yc_companies.csv`);
