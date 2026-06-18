import { Router, type IRouter } from "express";
import { desc, sql, eq } from "drizzle-orm";
import { db, songHistoryTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/history", async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const offset = (page - 1) * limit;
  const sessionIdRaw = req.query.sessionId ? parseInt(String(req.query.sessionId), 10) : null;
  const sessionId = sessionIdRaw && !isNaN(sessionIdRaw) ? sessionIdRaw : null;

  const baseQuery = db.select().from(songHistoryTable);
  const countQuery = db.select({ count: sql<number>`count(*)` }).from(songHistoryTable);

  if (sessionId !== null) {
    const [countResult] = await countQuery.where(eq(songHistoryTable.sessionId, sessionId));
    const total = Number(countResult?.count ?? 0);
    const items = await baseQuery
      .where(eq(songHistoryTable.sessionId, sessionId))
      .orderBy(desc(songHistoryTable.performedAt))
      .limit(limit)
      .offset(offset);
    res.json({ items, total, page, limit });
  } else {
    const [countResult] = await countQuery;
    const total = Number(countResult?.count ?? 0);
    const items = await baseQuery
      .orderBy(desc(songHistoryTable.performedAt))
      .limit(limit)
      .offset(offset);
    res.json({ items, total, page, limit });
  }
});

export default router;
