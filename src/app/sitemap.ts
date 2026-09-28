import type { MetadataRoute } from "next";
import { COLLECTIONS } from "@/data/collections";
import { PLACES } from "@/data";
import { SITE_URL } from "@/lib/site";

/**
 * Sitemap.
 *
 * Collection routes and place pages are both genuinely useful in search, so both are
 * listed. The place count is small enough that a full listing is honest rather than
 * sampled.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/m`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/list`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/plan`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/table`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  const collections: MetadataRoute.Sitemap = COLLECTIONS.map((collection) => ({
    url: `${SITE_URL}/c/${collection.id}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const places: MetadataRoute.Sitemap = PLACES.map((place) => ({
    url: `${SITE_URL}/place/${place.id}`,
    lastModified: new Date(`${place.lastVerified}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: place.status === "active" ? 0.7 : 0.3,
  }));

  return [...statics, ...collections, ...places];
}
