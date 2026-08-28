import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "GTM teammate",
  description: "Private campaign playbooks and campaign preparation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
