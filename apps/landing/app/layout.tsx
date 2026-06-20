import type { Metadata } from "next";
import localFont from "next/font/local";
import { Figtree, Raleway, Crimson_Text } from "next/font/google";
import "./globals.css";

import { cn } from "@/lib/utils";

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
  title: "Weppo",
  description:
    "Turn your expertise into a branded AI copilot for clients, students, and subscribers.",
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
