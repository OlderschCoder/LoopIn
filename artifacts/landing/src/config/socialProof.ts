/**
 * Social proof constants for the landing page.
 *
 * These values are intentionally kept as a single source of truth so they can
 * be updated in one place when the app goes live on the App Store / Play Store.
 *
 * --- Future: live data ---
 * Once the app has public store listings you can replace these static values
 * by fetching from the stores and caching the result server-side:
 *
 *  • App Store Connect API  – GET /v1/apps/{id}/customerReviews (requires an
 *    App Store Connect API key; aggregate rating is available via the App
 *    Analytics endpoint or a third-party like AppFollow / Sensor Tower).
 *
 *  • Google Play Developer API – reviews.list (requires Play Developer API
 *    credentials; aggregate rating can be scraped or pulled from the
 *    android-publisher API).
 *
 * Cache the fetched values (e.g. in KV / database) and expose them through
 * the api-server so the landing page stays static-friendly.
 */

export const SOCIAL_PROOF = {
  /**
   * Weighted average star rating shown beneath the store badges.
   * Range: 0–5 (one decimal place rendered).
   */
  rating: 4.8,

  /**
   * Human-readable review count label (e.g. "2,400+").
   * Update this when the review count grows meaningfully.
   */
  reviewCount: "2,400+",
} as const;
