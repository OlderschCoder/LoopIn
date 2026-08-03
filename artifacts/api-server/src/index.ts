import app from "./app";
import { logger } from "./lib/logger";
import { startRatingsRefreshScheduler } from "./jobs/refreshRatings";

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
});
