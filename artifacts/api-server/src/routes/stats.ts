import { Router, type IRouter } from "express";
import { sql, desc } from "drizzle-orm";
import { db, songsTable, queueTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [totalSongsResult] = await db.select({ count: sql<number>`count(*)` }).from(songsTable);
  const [totalPlayedResult] = await db.select({ count: sql<number>`count(*)` }).from(queueTable)
    .where(sql`${queueTable.status} = 'completed'`);

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

  res.json({
    totalSongs: Number(totalSongsResult?.count ?? 0),
    totalPlayed: Number(totalPlayedResult?.count ?? 0),
    topSongs,
    languageBreakdown: languageBreakdown.map(r => ({ language: r.language, count: Number(r.count) })),
  });
});

export default router;
