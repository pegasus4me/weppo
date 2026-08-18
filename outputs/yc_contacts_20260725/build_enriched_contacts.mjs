import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const outputDir = "/Users/user/Desktop/research/weppo/outputs/yc_contacts_20260725";
const inputPath = "/Users/user/Downloads/yc_horizontal_b2b_saas_39.csv";
const csvOutputPath = path.join(outputDir, "yc_horizontal_b2b_saas_39_enriched.csv");
const xlsxOutputPath = path.join(outputDir, "yc_horizontal_b2b_saas_39_enriched.xlsx");
const summaryPreviewPath = path.join(outputDir, "preview_summary.png");
const prospectsPreviewPath = path.join(outputDir, "preview_prospects.png");

const contacts = [
  ["AfterQuery", "Carlos Georgescu", "https://www.linkedin.com/in/carlossgg/", "Cofondateur — aucun responsable CS public confirmé", "Demande d’introduction", "Moyenne", "B", "Demander qui possède le support et les escalades techniques."],
  ["Anakin", "Devaloy Mukherjee", "https://in.linkedin.com/in/devaloymukherjee", "Opérateur customer-facing — titre exact non confirmé", "Discovery directe", "Moyenne", "B", "Valider son périmètre support/CS avant l’entretien."],
  ["Artisan", "Robert Catanzaro", "https://www.linkedin.com/in/robert-catanzaro-224389147", "Customer Success", "Discovery directe", "Élevée", "B", "Bon interlocuteur opérationnel pour les frictions et escalades clients."],
  ["authzed", "Evan Cordell", "https://www.linkedin.com/in/evan-cordell-6206a1b", "Équipe technique en contact avec les clients", "Discovery directe", "Moyenne", "B", "Profil technique utile pour comprendre les escalades liées aux permissions."],
  ["Bland AI", "Lucca Psaila", "https://www.linkedin.com/in/luccapsaila", "Head of Customer Engineering", "Discovery directe", "Élevée", "A", "Très forte proximité avec le diagnostic technique et les déploiements clients."],
  ["cloud humans", "Bruna Chaves", "https://br.linkedin.com/in/bruna-chaves-ops", "Responsable Operations, Support et Customer Success", "Interview expert marché", "Élevée", "C", "Acteur du support : excellent expert marché, mais pas prospect prioritaire."],
  ["Coast", "Vincent L.", "https://www.linkedin.com/in/vincent-levinger-secure", "Technical Account Manager — ancien Head of Support", "Discovery directe", "Élevée", "A", "Très bon profil pour parler escalades techniques et autonomie du support."],
  ["CodeAnt AI", "Utkarsh Choubey", "https://in.linkedin.com/in/utkarshinfo", "Product Growth, Customer Success et problèmes clients", "Discovery directe", "Élevée", "A", "Rôle transversal proche des problèmes clients et du produit."],
  ["Dynamo AI", "Christian Lau", "https://www.linkedin.com/in/christian-lau-18055546", "Cofondateur / CPO — aucun responsable post-sales confirmé", "Demande d’introduction", "Moyenne", "B", "Demander une introduction vers la personne qui gère les déploiements et incidents clients."],
  ["Escape", "Tristan Kalos", "https://linkedin.com/in/tkalos", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Demander le propriétaire du support technique et des escalades."],
  ["Extend", "Eli Badgio", "https://www.linkedin.com/in/eli-badgio/", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Fondateur-relais vers le responsable Customer Success ou support."],
  ["Firecrawl", "Caleb Peffer", "https://www.linkedin.com/in/caleb-peffer/", "Cofondateur — fonction Success Engineering en construction", "Demande d’introduction", "Moyenne", "B", "Demander qui gère aujourd’hui le support technique et la future équipe Success Engineering."],
  ["Floworks", "Sudipta Biswas", "https://www.linkedin.com/in/sudipta-biswas/", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Fondateur-relais vers la personne responsable des clients et intégrations."],
  ["Greptile", "Daksh Gupta", "https://linkedin.com/in/dakshg", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Demander qui gère les escalades clients et les investigations techniques."],
  ["GrowthBook", "Graham McNicoll", "https://www.linkedin.com/in/grahammcnicoll/", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Fondateur-relais vers Support ou Customer Success."],
  ["Gumloop", "John Howorth", "https://ca.linkedin.com/in/johnchoworth", "Senior Account Manager — expert produit client", "Discovery directe", "Élevée", "B", "Bon profil client-facing ; valider son exposition aux tickets et escalades."],
  ["HockeyStack", "Sunil Joseph", "https://www.linkedin.com/in/joesunil", "VP Customer Success — périmètre Support et Implementation", "Discovery directe", "Élevée", "A", "Acheteur très aligné avec le problème, les coûts et les métriques support."],
  ["Hudu", "Jacob Hart", "https://www.linkedin.com/in/jacob-hart-22499a105/", "Cofondateur très impliqué dans le feedback client", "Discovery / referral", "Moyenne", "B", "Peut répondre ou aiguiller vers l’équipe support."],
  ["Infisical", "Jake Hulberg", "https://www.linkedin.com/in/jake-hulberg-914964193", "Developer Advocate — interface technique avec les utilisateurs", "Discovery directe", "Élevée", "A", "Très bon témoin des questions techniques répétées et des lacunes de documentation."],
  ["IOMETE", "Vusal Dadalov", "https://www.linkedin.com/in/vusaldadalov/", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Demander qui possède le support technique et les déploiements data."],
  ["LanceDB", "Daisuke Kobayashi", "https://jp.linkedin.com/in/daisuke-kobayashi-b2673537", "Support Engineer", "Discovery directe", "Élevée", "A", "Utilisateur opérationnel direct du futur produit."],
  ["Middleware", "Laduram Vishnoi", "https://www.linkedin.com/in/laduramvishnoi/", "Fondateur — aucun Head of Support public confirmé", "Demande d’introduction", "Moyenne", "B", "Demander une introduction vers le propriétaire du support et de l’onboarding."],
  ["Mintlify", "Dean Sliney", "https://www.linkedin.com/in/dean-sliney", "Founding Support Engineer", "Discovery directe", "Élevée", "A", "Profil idéal pour comprendre le support technique dans une petite équipe en croissance."],
  ["OneSchema", "Ashley Borne", "https://www.linkedin.com/in/ashleyborne", "Head of Customer Success", "Discovery directe", "Élevée", "A", "Acheteuse potentielle très alignée avec l’ICP et le résultat recherché."],
  ["Onyx", "Chris Weaver", "https://linkedin.com/in/chris-weaver101", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Demander qui gère le support des intégrations et déploiements."],
  ["Open", "Mohammad Gharbat", "https://linkedin.com/in/gharabat", "Cofondateur", "Interview expert marché", "Élevée", "C", "Acteur proche du problème : interview marché/compétiteur, pas prospect prioritaire."],
  ["Optery", "Nandakumar Subramaniam", "https://www.linkedin.com/in/nandakumarsubramaniam", "Customer Success et Product Growth", "Discovery directe", "Moyenne", "C", "Fit plus faible car le produit comporte une composante B2C importante."],
  ["Outset", "Omika Jikaria", "https://www.linkedin.com/in/omikajikaria", "Post-sales, adoption et comptes stratégiques", "Discovery directe", "Élevée", "B", "Bon interlocuteur post-sales ; valider la part de support technique."],
  ["Popl", "Jason Alco", "https://www.linkedin.com/in/jasonalco/", "Fondateur — leadership CS non confirmé", "Demande d’introduction", "Moyenne", "B", "Demander qui dirige Customer Success ou le support."],
  ["Rally UXR", "Anna Zahm", "https://www.linkedin.com/in/annazahm", "Customer Support", "Discovery directe", "Élevée", "A", "Profil opérationnel directement exposé au workflow support."],
  ["Reducto", "Adit Abraham", "https://linkedin.com/in/aditabraham", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Demander qui gère les déploiements et incidents clients."],
  ["Rollstack", "Emily Miller", "https://es.linkedin.com/in/emily-swift-miller", "Senior Customer Success Manager — première CSM", "Discovery directe", "Élevée", "A", "Très bon profil pour parler structuration du CS dans une équipe en croissance."],
  ["Shaped", "Tullie Murrell", "https://www.linkedin.com/in/tullie/", "Fondateur — aucun responsable Support public confirmé", "Demande d’introduction", "Moyenne", "B", "Fondateur-relais vers le propriétaire du support technique."],
  ["SigNoz", "Pranay Prateek", "https://www.linkedin.com/in/pranay-prateek-b8b563b/", "Cofondateur", "Demande d’introduction", "Moyenne", "B", "Demander qui possède le support, la communauté et les escalades."],
  ["Stacksync", "Venkat Nikhil Mangipudi", "https://www.linkedin.com/in/venkatnikhilm", "Ingénieur impliqué dans les implémentations clients", "Discovery directe", "Moyenne", "B", "Profil technique exposé aux implémentations ; confirmer son rôle customer-facing."],
  ["testRigor", "David Pyrzenski", "https://www.linkedin.com/in/pyrzenski", "Dirigeant GTM — périmètre CS, services et support", "Discovery directe", "Élevée", "A", "Acheteur potentiel couvrant directement Customer Success et support."],
  ["Unlayer", "Daniyal Amir", "https://pk.linkedin.com/in/daniyal-amir-959881238", "Customer Experience Specialist", "Discovery directe", "Élevée", "B", "Bon profil opérationnel ; confirmer son exposition aux demandes techniques."],
  ["Uplane", "Daniel Exler", "https://www.linkedin.com/in/danielexler", "Opérateur client et AI Marketing Strategist", "Discovery directe", "Élevée", "B", "Profil client-facing ; valider la complexité du support et des workflows."],
  ["Writesonic", "Samanyou Garg", "https://www.linkedin.com/in/samanyougarg/", "Fondateur — responsable CS non confirmé publiquement", "Demande d’introduction", "Moyenne", "B", "Demander une introduction vers le responsable Customer Success ou support."]
];

function csvCell(value) {
  const text = value == null ? "" : value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

await fs.mkdir(outputDir, { recursive: true });
const csvText = await fs.readFile(inputPath, "utf8");
const workbook = await Workbook.fromCSV(csvText, { sheetName: "Prospects" });
const prospects = workbook.worksheets.getItem("Prospects");
const baseValues = prospects.getUsedRange().values;

if (baseValues.length !== 40) {
  throw new Error(`Expected 40 rows including header, found ${baseValues.length}`);
}

const normalizedHeaders = baseValues[0].map((value) => String(value ?? "").replace(/^\uFEFF/, ""));
const companyColumn = normalizedHeaders.indexOf("entreprise");
if (companyColumn === -1) {
  throw new Error("Missing entreprise column");
}

const contactByCompany = new Map(contacts.map((row) => [row[0], row]));
const inputCompanies = baseValues.slice(1).map((row) => String(row[companyColumn] ?? ""));
const missingContacts = inputCompanies.filter((company) => !contactByCompany.has(company));
const extraContacts = contacts.map((row) => row[0]).filter((company) => !inputCompanies.includes(company));
if (missingContacts.length || extraContacts.length) {
  throw new Error(`Contact mapping mismatch. Missing: ${missingContacts.join(", ")}. Extra: ${extraContacts.join(", ")}`);
}

const enrichmentHeaders = [
  "contact_prioritaire",
  "linkedin_contact_prioritaire",
  "role_contact",
  "type_approche",
  "niveau_confiance",
  "priorite_outreach",
  "notes_ciblage",
  "source_validation_contact"
];

prospects.getRange("P1:W1").values = [enrichmentHeaders];
const enrichmentRows = inputCompanies.map((company) => {
  const [, contact, linkedin, role, approach, confidence, priority, notes] = contactByCompany.get(company);
  return [contact, linkedin, role, approach, confidence, priority, notes, linkedin];
});
prospects.getRange("P2:W40").values = enrichmentRows;

prospects.showGridLines = false;
prospects.freezePanes.freezeRows(1);
prospects.freezePanes.freezeColumns(1);
prospects.getRange("A1:W40").format = {
  font: { name: "Aptos", size: 10, color: "#172033" },
  verticalAlignment: "center"
};
prospects.getRange("A1:W1").format = {
  fill: "#172554",
  font: { name: "Aptos", size: 10, bold: true, color: "#FFFFFF" },
  wrapText: true,
  rowHeight: 34,
  verticalAlignment: "center"
};
prospects.getRange("A2:W40").format.rowHeight = 42;
prospects.getRange("A2:W40").format.wrapText = true;
prospects.getRange("A1:W40").format.borders = {
  preset: "all",
  style: "thin",
  color: "#DDE3EC"
};

const widths = {
  A: 18, B: 14, C: 12, D: 30, E: 34, F: 44, G: 32, H: 32, I: 34, J: 38,
  K: 16, L: 20, M: 14, N: 32, O: 14, P: 23, Q: 38, R: 40, S: 24, T: 15,
  U: 15, V: 46, W: 38
};
for (const [column, width] of Object.entries(widths)) {
  prospects.getRange(`${column}1:${column}40`).format.columnWidth = width;
}
prospects.getRange("C2:C40").format.horizontalAlignment = "center";
prospects.getRange("K2:O40").format.horizontalAlignment = "center";
prospects.getRange("T2:U40").format.horizontalAlignment = "center";
prospects.getRange("O2:O40").format.numberFormat = "yyyy-mm-dd";

for (let row = 2; row <= 40; row += 1) {
  const priority = String(prospects.getRange(`U${row}`).values[0][0] ?? "");
  const range = prospects.getRange(`P${row}:W${row}`);
  if (priority === "A") {
    range.format.fill = "#ECFDF5";
    prospects.getRange(`U${row}`).format = {
      fill: "#16A34A",
      font: { bold: true, color: "#FFFFFF" },
      horizontalAlignment: "center"
    };
  } else if (priority === "B") {
    range.format.fill = "#EFF6FF";
    prospects.getRange(`U${row}`).format = {
      fill: "#2563EB",
      font: { bold: true, color: "#FFFFFF" },
      horizontalAlignment: "center"
    };
  } else {
    range.format.fill = "#FFF7ED";
    prospects.getRange(`U${row}`).format = {
      fill: "#EA580C",
      font: { bold: true, color: "#FFFFFF" },
      horizontalAlignment: "center"
    };
  }
}

prospects.tables.add("A1:W40", true, "YCProspects");

const summary = workbook.worksheets.add("Synthèse");
summary.showGridLines = false;
summary.freezePanes.freezeRows(3);
summary.getRange("A1:F1").merge();
summary.getRange("A1").values = [["YC B2B SaaS — contacts pour discovery"]];
summary.getRange("A1:F1").format = {
  fill: "#172554",
  font: { name: "Aptos Display", size: 18, bold: true, color: "#FFFFFF" },
  rowHeight: 34,
  verticalAlignment: "center"
};
summary.getRange("A2:F2").merge();
summary.getRange("A2").values = [["39 entreprises conservées • Contacts LinkedIn ajoutés • Priorités A/B/C pour organiser l’outreach"]];
summary.getRange("A2:F2").format = {
  fill: "#DBEAFE",
  font: { name: "Aptos", size: 10, italic: true, color: "#1E3A8A" },
  rowHeight: 26,
  verticalAlignment: "center"
};

summary.getRange("A4:A9").values = [
  ["Total entreprises"],
  ["Contacts renseignés"],
  ["Priorité A"],
  ["Priorité B"],
  ["Priorité C"],
  ["Discovery directe"]
];
summary.getRange("B4").formulas = [["=COUNTA(Prospects!A2:A40)"]];
summary.getRange("B5").formulas = [["=COUNTA(Prospects!P2:P40)"]];
summary.getRange("B6").formulas = [['=COUNTIF(Prospects!U2:U40,"A")']];
summary.getRange("B7").formulas = [['=COUNTIF(Prospects!U2:U40,"B")']];
summary.getRange("B8").formulas = [['=COUNTIF(Prospects!U2:U40,"C")']];
summary.getRange("B9").formulas = [['=COUNTIF(Prospects!S2:S40,"Discovery directe")']];
summary.getRange("A4:B9").format = {
  font: { name: "Aptos", size: 11, color: "#172033" },
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  rowHeight: 26,
  verticalAlignment: "center"
};
summary.getRange("A4:A9").format.fill = "#F1F5F9";
summary.getRange("A4:A9").format.font = { bold: true, color: "#334155" };
summary.getRange("B4:B9").format = {
  fill: "#FFFFFF",
  font: { size: 14, bold: true, color: "#172554" },
  horizontalAlignment: "center"
};

summary.getRange("D4:F4").merge();
summary.getRange("D4").values = [["Lecture des priorités"]];
summary.getRange("D4:F4").format = {
  fill: "#334155",
  font: { bold: true, color: "#FFFFFF" },
  rowHeight: 26,
  verticalAlignment: "center"
};
summary.getRange("D5:F7").values = [
  ["A", "Contact direct très aligné", "À contacter en premier"],
  ["B", "Bon contact ou fondateur-relais", "Deuxième vague"],
  ["C", "Expert marché, concurrent ou fit faible", "Apprentissage seulement"]
];
summary.getRange("D5:F7").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  wrapText: true,
  rowHeight: 42,
  verticalAlignment: "center"
};
summary.getRange("D5").format = { fill: "#16A34A", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };
summary.getRange("D6").format = { fill: "#2563EB", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };
summary.getRange("D7").format = { fill: "#EA580C", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };

const priorityA = inputCompanies
  .map((company) => contactByCompany.get(company))
  .filter((row) => row[6] === "A")
  .map(([company, contact, linkedin, role, approach, confidence]) => [company, contact, role, approach, confidence, linkedin]);

summary.getRange("A12:F12").values = [["Entreprise", "Contact prioritaire", "Rôle", "Approche", "Confiance", "LinkedIn"]];
summary.getRange(`A13:F${12 + priorityA.length}`).values = priorityA;
summary.getRange(`A12:F${12 + priorityA.length}`).format = {
  font: { name: "Aptos", size: 10, color: "#172033" },
  borders: { preset: "all", style: "thin", color: "#DDE3EC" },
  wrapText: true,
  verticalAlignment: "center"
};
summary.getRange("A12:F12").format = {
  fill: "#172554",
  font: { bold: true, color: "#FFFFFF" },
  rowHeight: 28,
  verticalAlignment: "center"
};
summary.getRange(`A13:F${12 + priorityA.length}`).format.rowHeight = 38;

const summaryWidths = { A: 18, B: 24, C: 42, D: 22, E: 15, F: 42 };
for (const [column, width] of Object.entries(summaryWidths)) {
  summary.getRange(`${column}1:${column}${12 + priorityA.length}`).format.columnWidth = width;
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(xlsxOutputPath);

const finalMatrix = prospects.getRange("A1:W40").values;
const enrichedCsv = `\uFEFF${finalMatrix.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
await fs.writeFile(csvOutputPath, enrichedCsv, "utf8");

const summaryPreview = await workbook.render({
  sheetName: "Synthèse",
  range: `A1:F${12 + priorityA.length}`,
  scale: 1,
  format: "png"
});
await fs.writeFile(summaryPreviewPath, new Uint8Array(await summaryPreview.arrayBuffer()));

const prospectsPreview = await workbook.render({
  sheetName: "Prospects",
  range: "P1:W12",
  scale: 1,
  format: "png"
});
await fs.writeFile(prospectsPreviewPath, new Uint8Array(await prospectsPreview.arrayBuffer()));

const keyRanges = await workbook.inspect({
  kind: "region",
  sheetId: "Prospects",
  range: "P1:W8",
  maxChars: 7000,
  tableMaxRows: 8,
  tableMaxCols: 8
});
const summaryInspection = await workbook.inspect({
  kind: "region",
  sheetId: "Synthèse",
  range: "A1:F23",
  maxChars: 7000,
  tableMaxRows: 24,
  tableMaxCols: 6
});
const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan"
});

console.log(JSON.stringify({
  rows: finalMatrix.length - 1,
  columns: finalMatrix[0].length,
  priorityA: priorityA.length,
  csvOutputPath,
  xlsxOutputPath,
  summaryPreviewPath,
  prospectsPreviewPath,
  keyRanges,
  summaryInspection,
  formulaErrors
}, null, 2));
