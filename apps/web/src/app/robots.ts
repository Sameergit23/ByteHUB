import { MetadataRoute } from "next";
import { siteConfig } from "../lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.siteUrl;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/admin/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
