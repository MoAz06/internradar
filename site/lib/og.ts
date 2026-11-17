import type { Metadata } from "next";

/** Open Graph and X card for a page, with its newspaper preview image from app/og. */
export function og(title: string, description: string, image: string, path: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description, url: `https://internradar.eu${path}`, siteName: "internradar", type: "website", images: [{ url: `/og/${image}.png`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [`/og/${image}.png`] },
  };
}
