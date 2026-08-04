import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Public endpoint: the Clerk *publishable* key is safe to expose by design
// (it is embedded in every web bundle). Mobile release builds fetch it at
// startup so the correct key (pk_test in dev, pk_live in production) is
// always used without baking it into the APK at CI build time.
router.get("/auth/config", (_req, res) => {
  const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!clerkPublishableKey) {
    res.status(503).json({ error: "Auth is not configured on this server." });
    return;
  }
  res.json({ clerkPublishableKey });
});

export default router;
