import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userDataTable } from "@workspace/db";
import { requireAuth, getUserId } from "../middlewares/requireAuth";

const router = Router();

router.get("/user-data", requireAuth, async (req, res) => {
  const userId = getUserId(req);

  try {
    const rows = await db
      .select()
      .from(userDataTable)
      .where(eq(userDataTable.userId, userId))
      .limit(1);

    res.json({
      data: rows[0]?.data ?? null,
      updatedAt: rows[0]?.updatedAt ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load user data");
    res.status(500).json({ error: "Failed to load user data" });
  }
});

router.put("/user-data", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { data } = req.body as { data?: unknown };

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    res.status(400).json({ error: "data must be a JSON object" });
    return;
  }

  try {
    const now = new Date();
    await db
      .insert(userDataTable)
      .values({ userId, data, updatedAt: now })
      .onConflictDoUpdate({
        target: userDataTable.userId,
        set: { data, updatedAt: now },
      });

    res.json({ ok: true, updatedAt: now });
  } catch (err) {
    req.log.error({ err }, "Failed to save user data");
    res.status(500).json({ error: "Failed to save user data" });
  }
});

export default router;
