import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://internradar.eu"),
  title: {
    default: "internradar",
    template: "%s · internradar",
  },
  description:
    "Tech internships and new grad roles in Europe, and how the hiring actually works.",
  openGraph: {
    title: "internradar",
    description:
      "Tech internships and new grad roles in Europe, and how the hiring actually works.",
    url: "https://internradar.eu",
    siteName: "internradar",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
