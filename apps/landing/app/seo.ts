export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3002";

export const siteTitle = "Weppo | AI copilots for expert-led audiences";

export const siteDescription =
  "Turn your expertise into a branded AI copilot that helps clients, students, and subscribers apply your ideas between touchpoints.";
