import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Billing & operations | Northstar Cloud",
  description:
    "Manage billing, integrations, and team settings for Northstar Labs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
