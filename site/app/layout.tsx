import type { Metadata } from "next";
import { Libre_Baskerville, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import { og } from "@/lib/og";

const display = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-libre" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source" });

const blurb = "Tech internships and new grad roles in Europe, with the hiring process at each company.";

export const metadata: Metadata = {
  metadataBase: new URL("https://internradar.eu"),
  title: {
    default: "internradar",
    template: "%s - internradar",
  },
  description: blurb,
  ...og("internradar", blurb, "home", "/"),
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable}`}>
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only bg-ink px-4 py-2.5 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
