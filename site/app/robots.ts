import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // everyone may read the site; the crawlers behind the AI assistants are named too, because some only
  // trust a line with their own name on it
  const assistants = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Bingbot", "Applebot", "Applebot-Extended", "DuckAssistBot", "CCBot", "meta-externalagent"];
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: assistants, allow: "/" },
    ],
    sitemap: "https://internradar.eu/sitemap.xml",
  };
}
