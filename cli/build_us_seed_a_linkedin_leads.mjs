import fs from "node:fs/promises";
import path from "node:path";

const root = "/Users/user/Desktop/research/weppo";
const outputPath = path.join(root, "outputs", "weppo_us_seed_a_200_linkedin_leads_20260826.csv");

const [descriptions, founders, companies] = await Promise.all([
  fs.readFile(path.join(root, "cli/outputs/yc_company_desc.json"), "utf8").then(JSON.parse),
  fs.readFile(path.join(root, "cli/outputs/yc_founders.json"), "utf8").then(JSON.parse),
  fs.readFile(path.join(root, "cli/outputs/yc_companies.json"), "utf8").then(JSON.parse)
]);

const companyById = new Map(companies.map((company) => [company.companyId, company]));
const foundersByCompany = new Map();
for (const founder of founders) {
  if (!foundersByCompany.has(founder.companyId)) foundersByCompany.set(founder.companyId, []);
  foundersByCompany.get(founder.companyId).push(founder);
}

const isUs = /(based in (San Francisco|New York|Los Angeles|Austin|Seattle|Boston|Chicago|Miami|Denver|Palo Alto|Mountain View|Redwood City|Menlo Park|Brooklyn|Washington, D\.C\.|Washington DC|Atlanta|Salt Lake City|Portland|San Diego|Dallas|Houston|Philadelphia|Minneapolis|Nashville|Detroit|Raleigh|Tampa|Las Vegas|Phoenix|Cambridge|Irvine|Santa Monica|Sunnyvale|Cupertino|Oakland|Berkeley)|USA|United States)/i;
const technical = /(api|developer|infrastructure|data|security|cloud|devops|observability|integration|workflow|automation|platform|software|engineering|database|analytics|machine learning|ai |ai-|saas|b2b|payments|fintech|healthcare|enterprise|compliance|identity|agents?)/i;
const b2bSignal = /(enterprise|teams|business|companies|customers|platform|api|developer|workflow|operations|insurance|financial|legal|healthcare|compliance|security|data|support|crm|database|cloud|infrastructure|software|saas|b2b|agent)/i;
const exclude = /(jet age|defense|birds|robot|robotics|marketplace|ticket resale|consumer|dentist|home|video content creators|space|therapeutics|brokerage|collections|debt collection|lending|private markets|real estate|office leasing)/i;

function companyScore(description) {
  const text = description.description;
  let score = 0;
  if (/(api|developer|infrastructure|data|security|cloud|devops|observability|integration|database|identity|software|saas)/i.test(text)) score += 4;
  if (/(enterprise|teams|business|customers|platform|workflow|operations|financial|legal|healthcare|compliance|support|crm|agent)/i.test(text)) score += 2;
  if (description.teamSize >= 10 && description.teamSize <= 50) score += 2;
  if (description.teamSize >= 15 && description.teamSize <= 35) score += 1;
  return score;
}

const eligibleCompanies = Object.entries(descriptions)
  .map(([companyId, info]) => ({ companyId, ...info, company: companyById.get(companyId) }))
  .filter(({ description, teamSize, companyId }) =>
    teamSize >= 8 && teamSize <= 50 && isUs.test(description) && technical.test(description) &&
    b2bSignal.test(description) && !exclude.test(description) && foundersByCompany.has(companyId)
  )
  .sort((a, b) => companyScore(b) - companyScore(a) || b.teamSize - a.teamSize || a.name.localeCompare(b.name));

const technicalContacts = [
  ["Bland AI", "Lucca Psaila", "Head of Customer Engineering", "https://www.linkedin.com/in/luccapsaila", "https://www.ycombinator.com/companies/bland-ai"],
  ["Coast", "Vincent L.", "Technical Account Manager / former Head of Support", "https://www.linkedin.com/in/vincent-levinger-secure", "https://www.ycombinator.com/companies/coast"],
  ["Firecrawl", "Caleb Peffer", "Co-founder; Success Engineering function being built", "https://www.linkedin.com/in/caleb-peffer/", "https://www.ycombinator.com/companies/firecrawl"],
  ["HockeyStack", "Sunil Joseph", "VP, Customer Success", "https://www.linkedin.com/in/joesunil", "https://www.ycombinator.com/companies/hockeystack"],
  ["Infisical", "Jake Hulberg", "Developer Advocate", "https://www.linkedin.com/in/jake-hulberg-914964193", "https://www.ycombinator.com/companies/infisical"],
  ["LanceDB", "Daisuke Kobayashi", "Support Engineer", "https://jp.linkedin.com/in/daisuke-kobayashi-b2673537", "https://www.ycombinator.com/companies/lancedb"],
  ["Mintlify", "Dean Sliney", "Founding Support Engineer", "https://www.linkedin.com/in/dean-sliney", "https://www.ycombinator.com/companies/mintlify"],
  ["OneSchema", "Ashley Borne", "Head of Customer Success", "https://www.linkedin.com/in/ashleyborne", "https://www.ycombinator.com/companies/oneschema"],
  ["Rally UXR", "Anna Zahm", "Customer Support", "https://www.linkedin.com/in/annazahm", "https://www.ycombinator.com/companies/rally-uxr"],
  ["Rollstack", "Emily Miller", "Senior Customer Success Manager", "https://es.linkedin.com/in/emily-swift-miller", "https://www.ycombinator.com/companies/rollstack"],
  ["Stacksync", "Venkat Nikhil Mangipudi", "Customer implementation engineer", "https://www.linkedin.com/in/venkatnikhilm", "https://www.ycombinator.com/companies/stacksync"],
  ["testRigor", "David Pyrzenski", "GTM leader covering Customer Success, Services and Support", "https://www.linkedin.com/in/pyrzenski", "https://www.ycombinator.com/companies/testrigor"],
  ["Unlayer", "Daniyal Amir", "Customer Experience Specialist", "https://pk.linkedin.com/in/daniyal-amir-959881238", "https://www.ycombinator.com/companies/unlayer"],
  ["Artisan", "Robert Catanzaro", "Customer Success", "https://www.linkedin.com/in/robert-catanzaro-224389147", "https://www.ycombinator.com/companies/artisan"],
  ["authzed", "Evan Cordell", "Customer-facing technical team", "https://www.linkedin.com/in/evan-cordell-6206a1b", "https://www.ycombinator.com/companies/authzed"]
];

const rows = technicalContacts.map(([company, fullName, title, linkedin, ycCompanyUrl]) => ({
  company, fullName, title, contactType: "Technical support-facing", linkedin, ycCompanyUrl,
  employeeBand: "Verify", stageEvidence: "Targeted as Seed/Series A; verify latest round before outreach",
  icpRationale: "Owns, supports, or is adjacent to complex customer escalations.",
  source: linkedin
}));

for (const candidate of eligibleCompanies) {
  const linkedFounders = (foundersByCompany.get(candidate.companyId) ?? []).filter((founder) => founder.linkedinUrl);
  for (const founder of linkedFounders) {
    if (rows.length >= 200) break;
    rows.push({
      company: candidate.name,
      fullName: founder.founderName,
      title: founder.founderTitle || "Founder / Co-founder",
      contactType: "Founder / co-founder",
      linkedin: founder.linkedinUrl,
      ycCompanyUrl: candidate.company?.ycUrl ?? `https://www.ycombinator.com/companies/${candidate.slug}`,
      employeeBand: `${candidate.teamSize} employees (YC directory snapshot)`,
      stageEvidence: `YC-backed; founded ${candidate.description.match(/Founded in (\d{4})/)?.[1] ?? "recently"}. Targeted as Seed/Series A; verify latest round before outreach`,
      icpRationale: candidate.description.replace(/\s+/g, " ").trim(),
      source: founder.linkedinUrl
    });
  }
  if (rows.length >= 200) break;
}

if (rows.length !== 200) throw new Error(`Expected 200 leads; generated ${rows.length}`);

function csv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const headers = [
  "lead_id", "company", "full_name", "title", "contact_type", "linkedin_url", "yc_company_url",
  "employee_band", "stage_evidence", "icp_rationale", "source_url", "research_date"
];
const lines = [headers.join(",")];
for (const [index, row] of rows.entries()) {
  lines.push([
    `WEPPO-US-${String(index + 1).padStart(3, "0")}`, row.company, row.fullName, row.title, row.contactType,
    row.linkedin, row.ycCompanyUrl, row.employeeBand, row.stageEvidence, row.icpRationale, row.source, "2026-08-26"
  ].map(csv).join(","));
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${lines.join("\n")}\n`);
console.log(JSON.stringify({ outputPath, count: rows.length, technicalSupportFacing: technicalContacts.length, founders: rows.length - technicalContacts.length }, null, 2));
