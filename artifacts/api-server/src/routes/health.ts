import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getRefreshStatus } from "../jobs/refreshRatings";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * GET /api/health
 *
 * Reports the overall server health and the outcome of the most recent
 * ratings-refresh cycle.  Clients and monitoring tools can use this to detect
 * a prolonged store API outage before stale data reaches end users.
 *
 * Response shape:
 * {
 *   status:             "ok" | "degraded"
 *   ratingsRefresh: {
 *     lastRunAt:        string | null   — ISO-8601, or null if never run
 *     lastSucceededAt:  string | null   — ISO-8601, or null if never succeeded
 *     lastRunSucceeded: boolean | null  — null if the job has never run
 *     lastError:        string | null   — error message from the last failure
 *   }
 * }
 *
 * HTTP status codes:
 *   200 — healthy (last cycle succeeded, or the job has never run yet)
 *   503 — degraded (the most recent refresh cycle failed after all retries)
 *
 * 503 is returned whenever the last cycle failed — regardless of whether there
 * was a prior successful run — so uptime monitors reliably detect regressions.
 */
router.get("/health", (_req, res) => {
  const refresh = getRefreshStatus();

  // Return 503 whenever the most recent cycle failed (all retries exhausted).
  // Not gated on lastSucceededAt so a later outage after prior successes is
  // also detected.
  const isDegraded = refresh.lastRunSucceeded === false;
  const httpStatus = isDegraded ? 503 : 200;

  res.status(httpStatus).json({
    status: isDegraded ? "degraded" : "ok",
    ratingsRefresh: {
      lastRunAt: refresh.lastRunAt?.toISOString() ?? null,
      lastSucceededAt: refresh.lastSucceededAt?.toISOString() ?? null,
      lastRunSucceeded: refresh.lastRunSucceeded,
      lastError: refresh.lastError,
    },
  });
});

export default router;
