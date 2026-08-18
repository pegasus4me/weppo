import type { Metadata } from "next";

import { Header } from "./components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weppo ",
  description: "Application dashboard for Weppo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
