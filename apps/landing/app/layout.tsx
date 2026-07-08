import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

import { siteDescription, siteTitle, siteUrl } from "./seo";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist-variable",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Weppo",
  title: {
    default: siteTitle,
    template: "%s | Weppo",
  },
  description: siteDescription,
  keywords: [
    "B2B SaaS support",
    "customer success",
    "support operations",
    "CS operations",
    "support escalation workflows",
    "internal knowledge workflows",
    "customer support knowledge base",
  ],
  authors: [{ name: "Weppo" }],
  creator: "Weppo",
  publisher: "Weppo",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Weppo",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/logo.png",
        width: 1711,
        height: 558,
        alt: "Weppo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body>{children}</body>
    </html>
  );
}
