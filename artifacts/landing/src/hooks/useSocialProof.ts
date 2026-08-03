/**
 * Fetches live social-proof data (rating + review count) from the api-server.
 * Falls back to the static SOCIAL_PROOF constants while loading or if the
 * request fails, so the UI always renders something meaningful.
 *
 * The API response includes a `source` field ("both_stores", "app_store",
 * "play_store", "static", or "static_fallback") and a `cachedAt` ISO-8601
 * timestamp.  When `source` is "static" or "static_fallback" the server is
 * already returning static constants, so the hook uses those values directly.
 * When `cachedAt` is present callers can check data freshness — a null value
 * indicates no live store data was available.
 */
import { useState, useEffect } from "react";
import { SOCIAL_PROOF } from "@/config/socialProof";

export interface SocialProofData {
  rating: number;
  reviewCount: string;
  /** ISO-8601 timestamp of the oldest contributing store fetch, or null for static data. */
  cachedAt: string | null;
}

const FALLBACK: SocialProofData = {
  rating: SOCIAL_PROOF.rating,
  reviewCount: SOCIAL_PROOF.reviewCount,
  cachedAt: null,
};

// Cache the result in module scope so sibling components don't double-fetch
let _cache: SocialProofData | null = null;
let _promise: Promise<SocialProofData> | null = null;

async function fetchSocialProof(): Promise<SocialProofData> {
  if (_promise) return _promise;
  _promise = (async () => {
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const url = `${base}api/social-proof`.replace(/\/+/g, "/").replace(/^\/\//, "/");
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (!res.ok) return FALLBACK;
      const data = (await res.json()) as {
        rating?: number;
        reviewCount?: string;
        source?: string;
        cachedAt?: string | null;
      };
      if (typeof data.rating !== "number" || !data.reviewCount) return FALLBACK;
      const result: SocialProofData = {
        rating: data.rating,
        reviewCount: data.reviewCount,
        cachedAt: data.cachedAt ?? null,
      };
      _cache = result;
      return result;
    } catch {
      return FALLBACK;
    }
  })();
  return _promise;
}

export function useSocialProof(): SocialProofData {
  const [data, setData] = useState<SocialProofData>(_cache ?? FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetchSocialProof().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
