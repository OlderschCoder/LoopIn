import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Cache for App Store / Google Play aggregate ratings.
 * One row per store (key: "app_store" | "play_store").
 * Refreshed by the /api/social-proof route on a TTL basis.
 */
export const storeRatingsTable = pgTable("store_ratings", {
  store: text("store").primaryKey(), // "app_store" | "play_store"
  rating: real("rating").notNull(),
  reviewCount: integer("review_count").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StoreRating = typeof storeRatingsTable.$inferSelect;
