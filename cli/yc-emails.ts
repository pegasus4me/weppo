import { readFileSync, writeFileSync } from "node:fs";

const founders = JSON.parse(readFileSync("outputs/yc_founders.json", "utf8"));
const domains = JSON.parse(readFileSync("outputs/yc_domains.json", "utf8"));

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanToken(s) {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function parseName(fullName) {
  // Remove parenthetical nicknames: 'Caroline "Shoe" Shoemaker' -> Caroline Shoemaker
  let name = fullName.replace(/\([^)]*\)/g, " ").replace(/"/g, " ");
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = cleanToken(parts[0]);
  const last = cleanToken(parts[parts.length - 1]);
  if (!first) return null;
  return { first, last: last && last !== first ? last : null };
}

const PATTERNS = [
  (f) => f.first,
  (f) => (f.last ? `${f.first}.${f.last}` : null),
  (f) => (f.last ? `${f.first}${f.last}` : null),
  (f) => (f.last ? `${f.first[0]}${f.last}` : null),
  (f) => (f.last ? `${f.first}_${f.last}` : null),
];

const rows = [];
let withDomain = 0;
let noDomain = 0;

for (const f of founders) {
  const d = domains[f.companyId];
  const domain = d?.domain;
  if (!domain) {
    noDomain++;
    rows.push({
      companyId: f.companyId,
      company: f.name,
      founder: f.founderName,
      title: f.founderTitle,
      batch: f.batch,
      linkedin: f.linkedinUrl,
      email_primary: "",
      email_alternates: "",
      status: "no_domain",
    });
    continue;
  }
  withDomain++;
  const parsed = parseName(f.founderName);
  if (!parsed) {
    rows.push({
      companyId: f.companyId,
      company: f.name,
      founder: f.founderName,
      title: f.founderTitle,
      batch: f.batch,
      linkedin: f.linkedinUrl,
      email_primary: "",
      email_alternates: "",
      status: "name_unparseable",
    });
    continue;
  }
  const candidates = PATTERNS.map((p) => p(parsed))
    .filter(Boolean)
    .map((local) => `${local}@${domain}`);
  const unique = [...new Set(candidates)];
  rows.push({
    companyId: f.companyId,
    company: f.name,
    founder: f.founderName,
    title: f.founderTitle,
    batch: f.batch,
    linkedin: f.linkedinUrl,
    email_primary: unique[0],
    email_alternates: unique.slice(1).join(" | "),
    status: "guessed_unverified",
  });
}

// CSV export for Smartlead / Instantly / any tool
const header =
  "company_id,company,founder,title,batch,linkedin,email_primary,email_alternates,status";
const csv = [
  header,
  ...rows.map((r) =>
    [
      r.companyId,
      `"${r.company.replace(/"/g, '""')}"`,
      `"${r.founder.replace(/"/g, '""')}"`,
      `"${(r.title ?? "").replace(/"/g, '""')}"`,
      r.batch,
      r.linkedin,
      r.email_primary,
      r.email_alternates,
      r.status,
    ].join(",")
  ),
].join("\n");

writeFileSync("outputs/yc_outreach_emails.csv", csv);
writeFileSync("outputs/yc_outreach_emails.json", JSON.stringify(rows, null, 2));

console.log(`Founders processed: ${rows.length}`);
console.log(`With domain (emails guessed): ${withDomain}`);
console.log(`No domain: ${noDomain}`);
console.log(`\nWrote outputs/yc_outreach_emails.csv + .json`);
console.log(`\n⚠️  Emails are UNVERIFIED guesses — verify before sending (bounce rate kills deliverability).`);
