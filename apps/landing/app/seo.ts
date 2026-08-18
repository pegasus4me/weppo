export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3002";

export const siteTitle = "Weppo | Reliable context for AI support agents";

export const siteDescription =
  "Weppo turns Slack, tickets, wikis, and internal tools into a continuously maintained context layer for accurate, consistent, company-specific AI support.";
