/**
 * Shared helpers for fetching and caching App Store / Google Play aggregate
 * ratings.  Used by both the /api/social-proof route (lazy refresh) and the
 * daily background scheduler (proactive refresh).
 */

import { db, storeRatingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import gplay from "google-play-scraper";

// ── Constants ────────────────────────────────────────────────────────────────

/** Static fallback matches landing/src/config/socialProof.ts */
export const RATINGS_FALLBACK = { rating: 4.8, reviewCount: 2400 } as const;

/** How long a cached row is considered fresh before a re-fetch is triggered. */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1_000; // 24 hours

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoreResult {
  rating: number;
  reviewCount: number;
}

// ── Store fetchers ───────────────────────────────────────────────────────────

/** Fetch aggregate rating from the iTunes public lookup API (no credentials). */
export async function fetchAppStoreRating(
  appId: string
): Promise<StoreResult | null> {
  try {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=us`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      resultCount: number;
      results: Array<{ averageUserRating?: number; userRatingCount?: number }>;
    };
    const app = json.results?.[0];
    if (!app?.averageUserRating || !app.userRatingCount) return null;
    return {
      rating: Math.round(app.averageUserRating * 10) / 10,
      reviewCount: app.userRatingCount,
    };
  } catch (err) {
    logger.warn({ err }, "fetchAppStoreRating failed");
    return null;
  }
}
/**
 * Fetch aggregate rating for a Google Play app.
 *
 * ── Official path: AppFollow (APPFOLLOW_API_KEY is set) ─────────────────────
 *   AppFollow is a paid ASO/review-management platform with a supported REST
 *   API that returns the true store aggregate score and total rating count
 *   sourced from Google Play Console data.
 *
 *   To enable: set the APPFOLLOW_API_KEY secret to a token generated in the
 *   AppFollow dashboard (Settings → API).
 *   Pricing: https://appfollow.io/pricing
 *
 *   Endpoint: GET https://api.appfollow.io/api/v2/reviews/stats/ratings
 *     ?ext_id=<packageName>
 *   Auth:     X-AppFollow-API-Token: <APPFOLLOW_API_KEY>
 *   Response: { avg_rating: 4.5, stars: 10000, stars1: …, stars5: … }
 *   Ref:      https://docs.api.appfollow.io/reference/stat_reviews_rating_…
 *
 * ── Unofficial fallback (no APPFOLLOW_API_KEY set) ──────────────────────────
 *   Uses the `google-play-scraper` npm package, which queries Google Play's
 *   own internal API directly from this server — no external third-party proxy
 *   is involved so there is no outside SLA dependency.  Returns the same full
 *   aggregate score and total rating count shown on the store listing, but is
 *   not backed by a support contract and may break if Google changes their
 *   internal API format.
 *
 * Note: Google does not expose an official public API for Play Store aggregate
 * star ratings.  The Google Play Developer Reporting API covers crash/ANR
 * vitals; the Android Publisher API reviews.list endpoint only surfaces reviews
 * that include written comments (not all star-only ratings) and therefore
 * cannot be used as a reliable aggregate-rating source.
 */
export async function fetchPlayStoreRating(
  packageName: string
): Promise<StoreResult | null> {
  // ── Official path: AppFollow ───────────────────────────────────────────────
  const appFollowKey = process.env.APPFOLLOW_API_KEY;
  if (appFollowKey) {
    try {
      const url =
        `https://api.appfollow.io/api/v2/reviews/stats/ratings` +
        `?ext_id=${encodeURIComponent(packageName)}`;
      const res = await fetch(url, {
        headers: { "X-AppFollow-API-Token": appFollowKey },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        logger.warn(
          { status: res.status, packageName },
          "fetchPlayStoreRating: AppFollow API non-OK — falling back"
        );
      } else {
        const json = (await res.json()) as {
          avg_rating?: number | string;
          stars?: number;
        };
        const rating =
          typeof json.avg_rating === "string"
            ? parseFloat(json.avg_rating)
            : json.avg_rating;
        const reviewCount = json.stars;
        if (rating && reviewCount) {
          logger.info(
            { packageName },
            "fetchPlayStoreRating: AppFollow (official)"
          );
          return {
            rating: Math.round(rating * 10) / 10,
            reviewCount,
          };
        }
        logger.warn(
          { packageName, json },
          "fetchPlayStoreRating: AppFollow returned no usable data — falling back"
        );
      }
    } catch (err) {
      logger.warn(
        { err },
        "fetchPlayStoreRating: AppFollow path error — falling back"
      );
    }
  }

  // ── Unofficial fallback: google-play-scraper ───────────────────────────────
  // Queries Google Play directly from this process; no third-party proxy.
  // Not backed by a support contract — see JSDoc above for details.
  try {
    const app = await gplay.app({ appId: packageName });
    if (!app?.score || !app.ratings) return null;
    logger.info(
      { packageName },
      "fetchPlayStoreRating: google-play-scraper (unofficial fallback)"
    );
    return {
      rating: Math.round(app.score * 10) / 10,
      reviewCount: app.ratings,
    };
  } catch (err) {
    logger.warn({ err }, "fetchPlayStoreRating: scraper fallback failed");
    return null;
  }
}

// ── Cache helpers ────────────────────────────────────────────────────────────

/** Read a cached row; return null if missing or expired. */
export async function getCached(store: string): Promise<StoreResult | null> {
  try {
    const rows = await db
      .select()
      .from(storeRatingsTable)
      .where(eq(storeRatingsTable.store, store));
    if (!rows.length) return null;
    const row = rows[0];
    const ageMs = Date.now() - row.fetchedAt.getTime();
    if (ageMs > CACHE_TTL_MS) return null;
    return { rating: row.rating, reviewCount: row.reviewCount };
  } catch {
    return null;
  }
}

/**
 * Return the `fetchedAt` timestamp of a cached row regardless of TTL.
 * Returns null if no row exists or the DB is unavailable.
 * Used by the /api/social-proof route to populate the `cachedAt` field.
 */
export async function getStoreFetchedAt(store: string): Promise<Date | null> {
  try {
    const rows = await db
      .select()
      .from(storeRatingsTable)
      .where(eq(storeRatingsTable.store, store));
    if (!rows.length) return null;
    return rows[0].fetchedAt;
  } catch {
    return null;
  }
}

/** Persist (upsert) a fresh result into the cache. */
export async function upsertCache(
  store: string,
  data: StoreResult
): Promise<void> {
  try {
    await db
      .insert(storeRatingsTable)
      .values({
        store,
        rating: data.rating,
        reviewCount: data.reviewCount,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: storeRatingsTable.store,
        set: {
          rating: data.rating,
          reviewCount: data.reviewCount,
          fetchedAt: new Date(),
        },
      });
  } catch (err) {
    logger.warn({ err }, "upsertCache failed — rating will be retried next cycle");
  }
}

/** Resolve live-or-cached data for one store. */
export async function resolveStore(
  storeKey: string,
  fetcher: () => Promise<StoreResult | null>
): Promise<StoreResult | null> {
  const cached = await getCached(storeKey);
  if (cached) return cached;

  const fresh = await fetcher();
  if (fresh) {
    await upsertCache(storeKey, fresh);
    return fresh;
  }
  return null;
}

/** Blend two store results weighted by review count. */
export function blend(a: StoreResult, b: StoreResult): StoreResult {
  const total = a.reviewCount + b.reviewCount;
  const weightedRating =
    (a.rating * a.reviewCount + b.rating * b.reviewCount) / total;
  return {
    rating: Math.round(weightedRating * 10) / 10,
    reviewCount: total,
  };
}

/** Format review count as a human-readable string, e.g. "2,400+". */
export function formatCount(n: number): string {
  const floored = Math.floor(n / 100) * 100;
  return floored.toLocaleString("en-US") + "+";
}

// ── High-level refresh ───────────────────────────────────────────────────────

/**
 * Unconditionally fetch fresh ratings from every configured store and write
 * them to the cache.  Used by the background scheduler.  The route uses
 * `resolveStore` instead (which skips the fetch when the cache is still fresh).
 *
 * Throws when ALL configured stores fail to return data.  A partial failure
 * (one of two stores returns null) is logged as a warning but does not throw
 * — at least one store's data was refreshed.  Throwing on total failure allows
 * the caller (scheduler) to apply retry-with-backoff logic.
 */
export async function forceRefreshAllStores(): Promise<void> {
  const appStoreId = process.env.APP_STORE_APP_ID;
  const playStoreId = process.env.GOOGLE_PLAY_APP_ID;

  if (!appStoreId && !playStoreId) {
    logger.debug("forceRefreshAllStores: no store IDs configured, skipping");
    return;
  }

  // Fetch both stores in parallel, tracking whether each one succeeded.
  const [appOk, playOk] = await Promise.all([
    appStoreId
      ? fetchAppStoreRating(appStoreId).then(async (result) => {
          if (result) {
            await upsertCache("app_store", result);
            logger.info({ result }, "App Store rating refreshed");
            return true;
          }
          logger.warn("App Store rating fetch returned null");
          return false;
        })
      : Promise.resolve(null), // null = store not configured

    playStoreId
      ? fetchPlayStoreRating(playStoreId).then(async (result) => {
          if (result) {
            await upsertCache("play_store", result);
            logger.info({ result }, "Google Play rating refreshed");
            return true;
          }
          logger.warn("Google Play rating fetch returned null");
          return false;
        })
      : Promise.resolve(null), // null = store not configured
  ]);

  // Determine how many configured stores succeeded.
  const outcomes = [appOk, playOk].filter((v) => v !== null) as boolean[];
  const succeeded = outcomes.filter(Boolean).length;

  if (succeeded === 0) {
    throw new Error(
      "All configured store fetches failed — ratings data may be stale"
    );
  }
}
