import { Router, type IRouter } from "express";
import { sql, desc, gte } from "drizzle-orm";
import { db, songsTable, songHistoryTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Lifetime
  const [{ count: totalSongs }] = await db.select({ count: sql<number>`count(*)` }).from(songsTable);
  const [{ count: totalCompleted }] = await db.select({ count: sql<number>`count(*)` }).from(songHistoryTable);

  const topSongs = await db.select().from(songsTable).orderBy(desc(songsTable.playCount)).limit(5);

  const languageBreakdown = await db
    .select({ language: songsTable.language, count: sql<number>`count(*)` })
    .from(songsTable)
    .groupBy(songsTable.language)
    .orderBy(sql`count(*) desc`);

  const recentPerformances = await db
    .select()
    .from(songHistoryTable)
    .orderBy(desc(songHistoryTable.performedAt))
    .limit(10);

  // Monthly
  const [{ count: monthlyCompleted }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(songHistoryTable)
    .where(gte(songHistoryTable.performedAt, monthStart));

  const [{ count: newSongs }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(songsTable)
    .where(gte(songsTable.createdAt, monthStart));

  const monthlyTopLanguages = await db
    .select({ language: songHistoryTable.language, count: sql<number>`count(*)` })
    .from(songHistoryTable)
    .where(gte(songHistoryTable.performedAt, monthStart))
    .groupBy(songHistoryTable.language)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  const totalCompleted_ = Number(totalCompleted ?? 0);

  res.json({
    totalSongs: Number(totalSongs ?? 0),
    totalPlayed: totalCompleted_,
    totalCompleted: totalCompleted_,
    topSongs,
    languageBreakdown: languageBreakdown.map(r => ({ language: r.language, count: Number(r.count) })),
    recentPerformances,
    monthly: {
      totalCompleted: Number(monthlyCompleted ?? 0),
      newSongs: Number(newSongs ?? 0),
      topLanguages: monthlyTopLanguages.map(r => ({ language: r.language, count: Number(r.count) })),
    },
  });
});

export default router;
