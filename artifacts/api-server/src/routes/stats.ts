import { Router, type IRouter } from "express";
import { sql, desc } from "drizzle-orm";
import { db, songsTable, songHistoryTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [totalSongsResult] = await db.select({ count: sql<number>`count(*)` }).from(songsTable);
  const [totalCompletedResult] = await db.select({ count: sql<number>`count(*)` }).from(songHistoryTable);

  const topSongs = await db.select().from(songsTable)
    .orderBy(desc(songsTable.playCount))
    .limit(5);

  const languageBreakdown = await db
    .select({
      language: songsTable.language,
      count: sql<number>`count(*)`,
    })
    .from(songsTable)
    .groupBy(songsTable.language)
    .orderBy(sql`count(*) desc`);

  const recentPerformances = await db
    .select()
    .from(songHistoryTable)
    .orderBy(desc(songHistoryTable.performedAt))
    .limit(5);

  const totalCompleted = Number(totalCompletedResult?.count ?? 0);

  res.json({
    totalSongs: Number(totalSongsResult?.count ?? 0),
    totalPlayed: totalCompleted,
    totalCompleted,
    topSongs,
    languageBreakdown: languageBreakdown.map(r => ({ language: r.language, count: Number(r.count) })),
    recentPerformances,
  });
});

export default router;
