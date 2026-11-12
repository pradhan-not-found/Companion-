import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://companion.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/sponsor", priority: 0.6, changeFrequency: "monthly" },
    { path: "/changelog", priority: 0.8, changeFrequency: "weekly" },
    { path: "/creator", priority: 0.5, changeFrequency: "monthly" },
  ];
  return pages.map(page => ({
    url: `${BASE_URL}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
