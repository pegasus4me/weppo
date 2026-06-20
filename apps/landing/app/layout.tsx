import type { Metadata } from "next";
import localFont from "next/font/local";
import { Figtree, Raleway, Crimson_Text } from "next/font/google";
import "./globals.css";

import { cn } from "@/lib/utils";
import { siteDescription, siteTitle, siteUrl } from "./seo";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway-variable",
});

const crimson_text = Crimson_Text({
  subsets: ["latin"],
  variable: "--font-crimson-text-variable",
  weight: ["400", "600", "700"],
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
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
    "AI copilot",
    "expert business",
    "client support",
    "online education",
    "coaching software",
    "audience support",
    "knowledge assistant",
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
    <html
      lang="en"
      className={cn(
        "font-sans",
        figtree.variable,
        raleway.variable,
        crimson_text.variable,
      )}
    >
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
