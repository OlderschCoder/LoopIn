import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";

// Attaches the authenticated Clerk userId to the request, or returns 401.
export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as { userId?: string }).userId = userId;
  next();
};

export function getUserId(req: unknown): string {
  return (req as { userId: string }).userId;
}
