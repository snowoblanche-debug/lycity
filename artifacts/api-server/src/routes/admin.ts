import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { signJWT, verifyJWT, requireAdmin } from "../middleware/auth";
import { db, settingsTable, songsTable, songHistoryTable, requesterStatsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/admin/login", (req, res): void => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!adminPassword) {
    res.status(503).json({ error: "Admin not configured. Set ADMIN_PASSWORD environment variable." });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "密碼錯誤" });
    return;
  }

  const token = signJWT({ role: "admin" });
  res.json({ token });
});

router.get("/admin/me", (req, res): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ isAdmin: false });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload || payload["role"] !== "admin") {
    res.status(401).json({ isAdmin: false });
    return;
  }
  res.json({ isAdmin: true });
});

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length === 0) {
    res.json({ obsKey: null });
    return;
  }
  res.json({ obsKey: rows[0].obsKey ?? null });
});

// GET /admin/requesters — list requesters by request count
router.get("/admin/requesters", requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(parseInt((req.query["limit"] as string) ?? "50", 10) || 50, 200);
  const items = await db
    .select()
    .from(requesterStatsTable)
    .orderBy(desc(requesterStatsTable.requestCount))
    .limit(limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(requesterStatsTable);
  res.json({ items, total: Number(count ?? 0) });
});

// POST /admin/stats/rebuild — recalculate all playCount values from song_history
router.post("/admin/stats/rebuild", requireAdmin, async (_req, res): Promise<void> => {
  // Recalculate play counts from history
  const historyCounts = await db
    .select({ songId: songHistoryTable.songId, count: sql<number>`count(*)` })
    .from(songHistoryTable)
    .where(sql`${songHistoryTable.songId} is not null`)
    .groupBy(songHistoryTable.songId);

  // Reset all songs to 0
  await db.update(songsTable).set({ playCount: 0 });

  // Update each song with its real count
  let songsUpdated = 0;
  for (const row of historyCounts) {
    if (row.songId) {
      await db.update(songsTable)
        .set({ playCount: Number(row.count) })
        .where(eq(songsTable.id, row.songId));
      songsUpdated++;
    }
  }

  res.json({ songsUpdated, message: `已重新計算 ${songsUpdated} 首歌曲的演唱次數` });
});

export default router;
