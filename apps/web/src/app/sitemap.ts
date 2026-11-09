import { MetadataRoute } from "next";
import { MOCK_INTERNSHIPS, MOCK_TRAINING_PROGRAMS } from "../lib/mockData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bytehub.io";
  const now = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/internships`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/training`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/companies`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  // Dynamic internship detail routes
  const internshipRoutes: MetadataRoute.Sitemap = MOCK_INTERNSHIPS.map((item) => ({
    url: `${baseUrl}/internships/${item.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Dynamic training detail routes
  const trainingRoutes: MetadataRoute.Sitemap = MOCK_TRAINING_PROGRAMS.map((item) => ({
    url: `${baseUrl}/training/${item.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...internshipRoutes, ...trainingRoutes];
}

