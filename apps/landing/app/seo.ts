export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3002";

export const siteTitle =
  "Weppo | Workflows for complex B2B SaaS customer cases";

export const siteDescription =
  "Help B2B SaaS support and customer success teams turn scattered internal knowledge into clear workflows for complex customer cases.";
