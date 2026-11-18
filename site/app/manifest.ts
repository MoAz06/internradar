import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** What Chrome needs to offer "Install app": a name, a start page, a standalone window and the icons. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "internradar",
    short_name: "internradar",
    description: "Tech internships and new grad roles in Europe, with the hiring process at each company.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff1e5",
    theme_color: "#fff1e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Saved", url: "/mine/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "This week", url: "/edition/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
