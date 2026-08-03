/**
 * GET /api/social-proof
 *
 * Returns the aggregate star rating and review count to display on the landing
 * page.  Results are cached in the `store_ratings` table for CACHE_TTL_MS so
 * the landing page never blocks on a live store API call.
 *
 * Stale-data policy
 * ─────────────────
 * When the scheduler's most recent refresh cycle failed (all retries exhausted),
 * the route immediately falls back to the static constant rather than serving
 * potentially stale cached DB values.  This ensures that a prolonged store API
 * outage surfaces the static fallback to visitors rather than keeping the last
 * known (and now outdated) rating on screen indefinitely.
 *
 * Response shape
 * ──────────────
 * {
 *   rating:      number           — weighted-average star rating
 *   reviewCount: string           — formatted count, e.g. "2,400+"
 *   source:      string           — "both_stores" | "app_store" | "play_store"
 *                                   | "static" | "static_fallback"
 *   cachedAt:    string | null    — ISO-8601 timestamp of the oldest cached
 *                                   store entry, or null for static responses
 * }
 *
 * Live fetching strategy
 * ──────────────────────
 * App Store  — iTunes Lookup API (public, no credentials required)
 *   https://itunes.apple.com/lookup?id=<APP_STORE_APP_ID>&country=us
 *   env: APP_STORE_APP_ID
 *
 * Google Play — No official Google API exposes aggregate star ratings.
 *   Primary:  AppFollow REST API (paid ASO platform with official data access).
 *             env: APPFOLLOW_API_KEY  (AppFollow dashboard → Settings → API)
 *   Fallback: google-play-scraper npm package — queries Google Play's own
 *             internal API directly; no external proxy involved, but not
 *             backed by a support contract.
 *   env: GOOGLE_PLAY_APP_ID
 *
 * Weighted average
 * ────────────────
 * When both stores return data the response blends them weighted by review
 * count so the displayed number reflects the full user base.
 *
 * Scheduled refresh
 * ─────────────────
 * A daily background job (started in index.ts) proactively refreshes the
 * cache so this route almost always serves a warm cached value instantly.
 * This lazy-refresh path acts as a safety net in case the server restarted
 * and the scheduled job hasn't run yet.
 */

import { Router, type IRouter } from "express";
import {
  RATINGS_FALLBACK,
  resolveStore,
  fetchAppStoreRating,
  fetchPlayStoreRating,
  blend,
  formatCount,
  getStoreFetchedAt,
  type StoreResult,
} from "../lib/storeRatings";
import { getRefreshStatus } from "../jobs/refreshRatings";
const router: IRouter = Router();

// ── Route ─────────────────────────────────────────────────────────────────────

router.get("/social-proof", async (_req, res) => {
  const appStoreId = process.env.APP_STORE_APP_ID;
  const playStoreId = process.env.GOOGLE_PLAY_APP_ID;

  // No store IDs configured yet — return static fallback immediately
  if (!appStoreId && !playStoreId) {
    return res.json({
      rating: RATINGS_FALLBACK.rating,
      reviewCount: formatCount(RATINGS_FALLBACK.reviewCount),
      source: "static",
      cachedAt: null,
    });
  }

  // Stale-data policy: if the most recent scheduler cycle failed (all retries
  // exhausted), serve the static fallback rather than potentially stale cached
  // DB values.  The `cachedAt` field would reveal how old the data is, but
  // showing static fallback is safer than presenting a frozen live number.
  const refreshStatus = getRefreshStatus();
  if (refreshStatus.lastRunSucceeded === false) {
    return res.json({
      rating: RATINGS_FALLBACK.rating,
      reviewCount: formatCount(RATINGS_FALLBACK.reviewCount),
      source: "static_fallback",
      cachedAt: null,
    });
  }

  // Fetch both stores in parallel (each independently cached)
  const [appStoreResult, playStoreResult] = await Promise.all([
    appStoreId
      ? resolveStore("app_store", () => fetchAppStoreRating(appStoreId))
      : Promise.resolve(null),
    playStoreId
      ? resolveStore("play_store", () => fetchPlayStoreRating(playStoreId))
      : Promise.resolve(null),
  ]);

  const results = [appStoreResult, playStoreResult].filter(
    Boolean
  ) as StoreResult[];

  if (results.length === 0) {
    // Lazy-refresh fetch also failed — serve static fallback
    return res.json({
      rating: RATINGS_FALLBACK.rating,
      reviewCount: formatCount(RATINGS_FALLBACK.reviewCount),
      source: "static_fallback",
      cachedAt: null,
    });
  }

  // Determine cachedAt: oldest fetchedAt among contributing stores so callers
  // can detect whether the data predates a known outage window.
  const activeStores: string[] = [];
  if (appStoreResult) activeStores.push("app_store");
  if (playStoreResult) activeStores.push("play_store");
  const fetchedAts = await Promise.all(activeStores.map(getStoreFetchedAt));
  const validTimestamps = fetchedAts.filter(Boolean) as Date[];
  const cachedAt =
    validTimestamps.length > 0
      ? new Date(
          Math.min(...validTimestamps.map((d) => d.getTime()))
        ).toISOString()
      : null;

  const merged =
    results.length === 2 ? blend(results[0], results[1]) : results[0];

  return res.json({
    rating: merged.rating,
    reviewCount: formatCount(merged.reviewCount),
    source:
      results.length === 2
        ? "both_stores"
        : appStoreResult
          ? "app_store"
          : "play_store",
    cachedAt,
  });
});

export default router;
