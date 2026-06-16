import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, songHistoryTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/history", async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const offset = (page - 1) * limit;

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(songHistoryTable);
  const total = Number(countResult?.count ?? 0);

  const items = await db
    .select()
    .from(songHistoryTable)
    .orderBy(desc(songHistoryTable.performedAt))
    .limit(limit)
    .offset(offset);

  res.json({ items, total, page, limit });
});

export default router;
