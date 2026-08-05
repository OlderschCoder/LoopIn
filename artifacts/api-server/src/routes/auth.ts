import { Router, type IRouter } from "express";

import {
  CLERK_PROXY_PATH,
  getClerkProxyHost,
} from "../middlewares/clerkProxyMiddleware";

const router: IRouter = Router();

// Public endpoint: the Clerk *publishable* key is safe to expose by design
// (it is embedded in every web bundle). Mobile release builds fetch it at
// startup so the correct key (pk_test in dev, pk_live in production) is
// always used without baking it into the APK at CI build time.
router.get("/auth/config", (req, res) => {
  const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!clerkPublishableKey) {
    res.status(503).json({ error: "Auth is not configured on this server." });
    return;
  }

  // Production Clerk traffic MUST go through this server's proxy: the live
  // key's own frontend-api host is not reachable, so a client that talks to
  // Clerk directly hangs forever and never finishes loading. Dev instances are
  // the opposite — proxying doesn't work for them and they must go direct.
  // Mirror clerkProxyMiddleware's own mount condition so we only ever advertise
  // a proxy that is actually running.
  const proxyMounted =
    process.env.NODE_ENV === "production" && !!process.env.CLERK_SECRET_KEY;

  let clerkProxyUrl: string | undefined;
  if (proxyMounted) {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const rawProto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto;
    const protocol = rawProto?.split(",")[0]?.trim() || "https";
    const host = getClerkProxyHost(req);
    if (host) {
      clerkProxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;
    }
  }

  res.json({
    clerkPublishableKey,
    ...(clerkProxyUrl ? { clerkProxyUrl } : {}),
  });
});

export default router;
