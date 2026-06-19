import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://paybook.ng"),
  title: {
    default: "Paybook — Financial OS for Nigerian Shop Owners",
    template: "%s · Paybook",
  },
  description:
    "Paybook is the all-in-one financial OS for Nigerian shop owners: point-of-sale, inventory, daily cash reconciliation, customer credit, and WhatsApp daily briefings.",
  applicationName: "Paybook",
  openGraph: {
    title: "Paybook — Financial OS for Nigerian Shop Owners",
    description:
      "Run your shop end to end: sales, inventory, cash reconciliation, customer credit, and a daily WhatsApp briefing.",
    siteName: "Paybook",
    url: "https://paybook.ng",
    locale: "en_NG",
    type: "website",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
