import app from "./app";
import { logger } from "./lib/logger";
import { startRatingsRefreshScheduler } from "./jobs/refreshRatings";
import { verifyPlayStoreServiceAccount } from "./lib/storeRatings";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start the daily background job that keeps store ratings up to date.
  // Runs once immediately (to prime the cache) then repeats every 24 hours.
  startRatingsRefreshScheduler();

  // If a Google Play service-account key is provisioned, verify it at startup
  // so credential problems surface immediately in logs rather than silently.
  // Non-blocking: a bad/missing key never prevents the server from starting.
  // Once Google exposes a true aggregate-rating endpoint this path will be
  // upgraded to use it for live ratings (see task #22).
  if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    const playStoreId = process.env.GOOGLE_PLAY_APP_ID ?? "com.example.app";
    verifyPlayStoreServiceAccount(playStoreId)
      .then((ok) => {
        if (ok) {
          logger.info(
            { packageName: playStoreId },
            "Google Play service-account credentials verified — ready for aggregate endpoint"
          );
        } else {
          logger.warn(
            { packageName: playStoreId },
            "Google Play service-account credentials invalid or unreachable — check GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"
          );
        }
      })
      .catch((err) =>
        logger.warn({ err }, "Google Play service-account probe failed unexpectedly")
      );
  }
});
