import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", ...["en", "fr"].flatMap((locale) => ["admin", "project", "share", "dashboard", "create", "settings", "credits", "brand-kit"].map((path) => `/${locale}/${path}`))] }, sitemap: `${siteConfig.url}/sitemap.xml` };
}
