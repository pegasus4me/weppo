import fs from "node:fs/promises";
import path from "node:path";
import { Workbook } from "@oai/artifact-tool";

const root = "/Users/user/Desktop/research/weppo";
const outputDir = path.join(root, "outputs", "speedrun_weppo_icp_20260827");
const inputPath = path.join(outputDir, "speedrun_75_company_research.json");
const outputPath = path.join(outputDir, "speedrun_us_b2b_75_companies_founders.csv");

const companies = JSON.parse(await fs.readFile(inputPath, "utf8"));
if (!Array.isArray(companies) || companies.length !== 75) {
  throw new Error(`Expected 75 companies, found ${Array.isArray(companies) ? companies.length : "invalid data"}`);
}

const headers = [
  "company_name",
  "cohort",
  "founded_year",
  "employee_count",
  "location",
  "company_website",
  "speedrun_company_url",
  "directory_summary",
  "founder_names",
  "founder_linkedin_urls",
  "founder_speedrun_profile_urls",
  "linkedin_status",
  "research_date"
];

const rows = companies.map((company) => {
  const founders = Array.isArray(company.founders) ? company.founders : [];
  const linkedinFounders = founders.filter((founder) => founder.linkedinUrl);
  return [
    company.companyName,
    company.cohort,
    company.founded,
    company.employees,
    company.location,
    company.companyWebsite,
    company.companyUrl,
    company.directorySummary,
    founders.map((founder) => founder.name).join(" | "),
    linkedinFounders.map((founder) => founder.linkedinUrl).join(" | "),
    founders.map((founder) => founder.speedrunProfileUrl).join(" | "),
    founders.length === 0 ? "No public Speedrun founder profile listed" :
      linkedinFounders.length === founders.length ? "All listed founders have LinkedIn" :
        `${linkedinFounders.length}/${founders.length} listed founders have LinkedIn`,
    "2026-08-27"
  ];
});

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";

// Use the spreadsheet runtime to validate the CSV structure before saving it.
const workbook = await Workbook.fromCSV(csv, { sheetName: "Speedrun ICP" });
const check = await workbook.inspect({
  kind: "table",
  range: "Speedrun ICP!A1:M8",
  include: "values",
  tableMaxRows: 8,
  tableMaxCols: 13
});
if (!check.ndjson.includes("company_name")) throw new Error("CSV validation failed: headers missing");

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, csv);

const founderCount = companies.reduce((count, company) => count + company.founders.length, 0);
const linkedinCount = companies.reduce((count, company) => count + company.founders.filter((founder) => founder.linkedinUrl).length, 0);
console.log(JSON.stringify({ outputPath, companies: companies.length, founderProfiles: founderCount, linkedInProfiles: linkedinCount }, null, 2));
