import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/user/Desktop/research/weppo/outputs/yc_horizontal_icp_2026-07-24";
const apiUrl = "https://yc-oss.github.io/api/companies/all.json";
const csvPath = path.join(outputDir, "yc_horizontal_b2b_saas_39.csv");
const xlsxPath = path.join(outputDir, "yc_horizontal_b2b_saas_39.xlsx");
const previewPath = path.join(outputDir, "yc_horizontal_b2b_saas_39_preview.png");
const collectionDate = "2026-07-24";

const years = new Set(["2021", "2022", "2023", "2024", "2025"]);
const excludedVerticals =
  /health|medical|medication|biotech|drug|clinical|insurance|construction|home service|hotel|travel|automotive|proptech|real estate|manufactur|industrial|agriculture|restaurant|retail|logistics|supply chain|government|govtech|space|satellite|aerospace|energy|climate|education|legal|recruit|hospital|bank|fintech|payments|accounting|tax|nonprofit|ecommerce|e-commerce/i;
const technicalSignals =
  /authorization|permission|webhook|integration|sync|\bapi\b|\bsdk\b|observability|monitoring|developer tool|infrastructure|workflow|database|data pipeline|data engineering|security|configuration|feature flag|secrets|ci\/cd|automation|documents|search|open source|analytics|customer support/i;

function batchYear(company) {
  return company.batch?.match(/(20\d{2})$/)?.[1] ?? null;
}

function hasUsHeadquarters(company) {
  return (company.all_locations ?? "").split(";")[0].trim().endsWith("USA");
}

function searchableText(company) {
  return [
    company.name,
    company.one_liner,
    company.long_description,
    company.industry,
    company.subindustry,
    ...(company.tags ?? []),
    ...(company.industries ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number(decimal)),
    )
    .replace(/&amp;/g, "&");
}

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; ICPResearch/1.0; public company research)",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }
  }
  throw lastError;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker),
  );
  return results;
}

function extractPublicCompanyData(html, url) {
  const match = html.match(
    /ShowPage-react-component[^>]*\sdata-page="([^"]+)"/,
  );
  if (!match) {
    throw new Error(`Public YC company payload not found: ${url}`);
  }
  const page = JSON.parse(decodeHtmlEntities(match[1]));
  const company = page?.props?.company;
  if (!company) {
    throw new Error(`Company object missing in YC payload: ${url}`);
  }
  return company;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const apiResponse = await fetch(apiUrl, {
  signal: AbortSignal.timeout(20000),
});
if (!apiResponse.ok) {
  throw new Error(`YC dataset failed: ${apiResponse.status}`);
}
const allCompanies = await apiResponse.json();

const selected = allCompanies
  .filter(
    (company) =>
      years.has(batchYear(company)) &&
      company.status === "Active" &&
      company.team_size >= 20 &&
      company.team_size <= 70 &&
      hasUsHeadquarters(company),
  )
  .filter((company) => {
    const text = searchableText(company);
    const isB2B =
      company.industry === "B2B" || (company.tags ?? []).includes("B2B");
    return (
      isB2B &&
      !excludedVerticals.test(text) &&
      technicalSignals.test(text)
    );
  })
  .sort((a, b) => a.name.localeCompare(b.name));

if (selected.length !== 39) {
  throw new Error(
    `Expected exactly 39 horizontal companies, received ${selected.length}`,
  );
}

const enriched = await mapWithConcurrency(selected, 4, async (apiCompany) => {
  const html = await fetchText(apiCompany.url);
  const publicCompany = extractPublicCompanyData(html, apiCompany.url);
  const founders = (publicCompany.founders ?? []).map((founder) => ({
    name: founder.full_name ?? "",
    linkedin: founder.linkedin_url ?? "",
  }));

  return {
    entreprise: publicCompany.name ?? apiCompany.name,
    batch: publicCompany.batch_name ?? apiCompany.batch,
    nombre_salaries_yc:
      publicCompany.team_size ?? apiCompany.team_size ?? null,
    categorie:
      apiCompany.subindustry || apiCompany.industry || "",
    tags: (publicCompany.tags ?? apiCompany.tags ?? []).join(" | "),
    description_courte:
      publicCompany.one_liner ?? apiCompany.one_liner ?? "",
    site_application:
      publicCompany.website ?? apiCompany.website ?? "",
    linkedin_entreprise: publicCompany.linkedin_url ?? "",
    fondateurs: founders.map((founder) => founder.name).join(" | "),
    linkedin_fondateurs: founders
      .map((founder) => founder.linkedin)
      .join(" | "),
    couverture_linkedin_fondateurs: `${
      founders.filter((founder) => founder.linkedin).length
    }/${founders.length}`,
    siege:
      publicCompany.location ||
      (apiCompany.all_locations ?? "").split(";")[0].trim(),
    recrute_sur_yc: apiCompany.isHiring ? "Oui" : "Non",
    profil_yc: apiCompany.url,
    date_collecte: collectionDate,
  };
});

const headers = [
  "entreprise",
  "batch",
  "nombre_salaries_yc",
  "categorie",
  "tags",
  "description_courte",
  "site_application",
  "linkedin_entreprise",
  "fondateurs",
  "linkedin_fondateurs",
  "couverture_linkedin_fondateurs",
  "siege",
  "recrute_sur_yc",
  "profil_yc",
  "date_collecte",
];
const rows = enriched.map((record) => headers.map((header) => record[header]));
const csv = [
  headers.map(csvEscape).join(","),
  ...rows.map((row) => row.map(csvEscape).join(",")),
].join("\r\n");
await fs.writeFile(csvPath, `\uFEFF${csv}\r\n`, "utf8");

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Prospects YC");
sheet.showGridLines = false;
sheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length).values = [
  headers,
  ...rows,
];
sheet.freezePanes.freezeRows(1);
sheet.freezePanes.freezeColumns(1);

const usedRange = sheet.getRangeByIndexes(
  0,
  0,
  rows.length + 1,
  headers.length,
);
usedRange.format = {
  font: { name: "Aptos", size: 10, color: "#172033" },
  verticalAlignment: "top",
};
sheet.getRangeByIndexes(0, 0, 1, headers.length).format = {
  fill: "#17324D",
  font: { name: "Aptos", size: 10, bold: true, color: "#FFFFFF" },
  verticalAlignment: "center",
  wrapText: true,
  rowHeight: 34,
  borders: {
    bottom: { style: "medium", color: "#0B2239" },
  },
};
sheet.getRange(`A2:O${rows.length + 1}`).format.borders = {
  insideHorizontal: { style: "thin", color: "#DCE3EA" },
};
sheet.getRange(`A2:O${rows.length + 1}`).format = {
  wrapText: true,
  rowHeight: 58,
  verticalAlignment: "top",
};
sheet.getRange(`C2:C${rows.length + 1}`).format.numberFormat = "0";
sheet.getRange(`C2:C${rows.length + 1}`).format.horizontalAlignment = "right";

const widths = [
  18, 12, 12, 28, 30, 36, 26, 30, 30, 42, 18, 24, 13, 32, 13,
];
widths.forEach((width, index) => {
  sheet.getRangeByIndexes(0, index, rows.length + 1, 1).format.columnWidth =
    width;
});

const table = sheet.tables.add(
  `A1:O${rows.length + 1}`,
  true,
  "YCProspectsTable",
);
table.style = "TableStyleMedium2";
table.showFilterButton = true;
table.showBandedRows = true;

const inspection = await workbook.inspect({
  kind: "table",
  range: "Prospects YC!A1:O8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 15,
  maxChars: 12000,
});
const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});

const preview = await workbook.render({
  sheetName: "Prospects YC",
  range: "A1:O12",
  scale: 1,
  format: "png",
});
await fs.writeFile(
  previewPath,
  new Uint8Array(await preview.arrayBuffer()),
);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(xlsxPath);

const missingFounderLinkedin = enriched
  .filter((record) => {
    const [covered, total] = record.couverture_linkedin_fondateurs
      .split("/")
      .map(Number);
    return covered < total;
  })
  .map((record) => ({
    entreprise: record.entreprise,
    couverture: record.couverture_linkedin_fondateurs,
  }));

console.log(
  JSON.stringify(
    {
      companies: enriched.length,
      totalFounders: enriched.reduce(
        (sum, record) =>
          sum + (record.fondateurs ? record.fondateurs.split(" | ").length : 0),
        0,
      ),
      companiesWithMissingFounderLinkedin: missingFounderLinkedin,
      csvPath,
      xlsxPath,
      previewPath,
      inspection: inspection.ndjson,
      formulaErrors: formulaErrors.ndjson,
    },
    null,
    2,
  ),
);
