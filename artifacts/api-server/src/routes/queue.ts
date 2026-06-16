import { Router, type IRouter } from "express";
import { eq, asc, sql, ne } from "drizzle-orm";
import { db, queueTable, songsTable, songHistoryTable } from "@workspace/db";
import {
  AddToQueueBody,
  RemoveFromQueueParams,
  CompleteQueueItemParams,
  ReorderQueueBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const songSelect = {
  id: songsTable.id,
  title: songsTable.title,
  artist: songsTable.artist,
  language: songsTable.language,
  playCount: songsTable.playCount,
  categories: songsTable.categories,
  youtubeUrl: songsTable.youtubeUrl,
  isPracticing: songsTable.isPracticing,
  hasPitchWarning: songsTable.hasPitchWarning,
  createdAt: songsTable.createdAt,
};

async function getActiveQueueWithSongs() {
  return db
    .select({
      id: queueTable.id,
      songId: queueTable.songId,
      requesterName: queueTable.requesterName,
      note: queueTable.note,
      position: queueTable.position,
      status: queueTable.status,
      createdAt: queueTable.createdAt,
      song: songSelect,
    })
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(ne(queueTable.status, "completed"))
    .orderBy(asc(queueTable.position), asc(queueTable.createdAt));
}

// Static/special routes MUST come before parameterised /:id routes

router.get("/queue", async (_req, res): Promise<void> => {
  const items = await getActiveQueueWithSongs();
  res.json({ items, total: items.length });
});

router.post("/queue", async (req, res): Promise<void> => {
  const parsed = AddToQueueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, parsed.data.songId));
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }

  const existing = await db
    .select({ position: queueTable.position })
    .from(queueTable)
    .where(ne(queueTable.status, "completed"))
    .orderBy(asc(queueTable.position));

  const maxPosition = existing.length > 0
    ? Math.max(...existing.map(e => e.position)) + 1
    : 0;

  const [item] = await db.insert(queueTable).values({
    songId: parsed.data.songId,
    requesterName: parsed.data.requesterName,
    note: parsed.data.note ?? null,
    position: maxPosition,
    status: "waiting",
  }).returning();

  res.status(201).json({ ...item, song });
});

router.patch("/queue/reorder", async (req, res): Promise<void> => {
  const parsed = ReorderQueueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  for (let i = 0; i < parsed.data.orderedIds.length; i++) {
    await db.update(queueTable)
      .set({ position: i })
      .where(eq(queueTable.id, parsed.data.orderedIds[i]));
  }
  const items = await getActiveQueueWithSongs();
  res.json({ items, total: items.length });
});

router.get("/queue/current", async (_req, res): Promise<void> => {
  const playingItems = await db
    .select({ id: queueTable.id, songId: queueTable.songId, requesterName: queueTable.requesterName, note: queueTable.note, position: queueTable.position, status: queueTable.status, createdAt: queueTable.createdAt, song: songSelect })
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(eq(queueTable.status, "playing"))
    .orderBy(asc(queueTable.createdAt))
    .limit(1);

  const waitingItems = await db
    .select({ id: queueTable.id, songId: queueTable.songId, requesterName: queueTable.requesterName, note: queueTable.note, position: queueTable.position, status: queueTable.status, createdAt: queueTable.createdAt, song: songSelect })
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(eq(queueTable.status, "waiting"))
    .orderBy(asc(queueTable.position), asc(queueTable.createdAt))
    .limit(2);

  const current = playingItems[0] ?? waitingItems[0] ?? null;
  const next = playingItems.length > 0 ? (waitingItems[0] ?? null) : (waitingItems[1] ?? null);

  res.json({ current, next });
});

router.delete("/queue/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = RemoveFromQueueParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.delete(queueTable).where(eq(queueTable.id, parsed.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Queue item not found" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/queue/:id/play", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  // Un-play any currently playing item back to waiting
  await db.update(queueTable)
    .set({ status: "waiting" })
    .where(eq(queueTable.status, "playing"));

  const [item] = await db.update(queueTable)
    .set({ status: "playing" })
    .where(eq(queueTable.id, id))
    .returning();

  if (!item) { res.status(404).json({ error: "Queue item not found" }); return; }

  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, item.songId));
  res.json({ ...item, song: song ?? null });
});

router.patch("/queue/:id/complete", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = CompleteQueueItemParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Fetch with song info
  const [queueEntry] = await db
    .select({
      id: queueTable.id,
      songId: queueTable.songId,
      requesterName: queueTable.requesterName,
      note: queueTable.note,
      position: queueTable.position,
      status: queueTable.status,
      createdAt: queueTable.createdAt,
      song: songSelect,
    })
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(eq(queueTable.id, parsed.data.id));

  if (!queueEntry) { res.status(404).json({ error: "Queue item not found" }); return; }

  // 1. Mark completed
  const [completedItem] = await db.update(queueTable)
    .set({ status: "completed" })
    .where(eq(queueTable.id, parsed.data.id))
    .returning();

  // 2. Increment play count on the song
  await db.update(songsTable)
    .set({ playCount: sql`${songsTable.playCount} + 1` })
    .where(eq(songsTable.id, queueEntry.songId));

  // 3. Create song history record
  await db.insert(songHistoryTable).values({
    songId: queueEntry.songId,
    songTitle: queueEntry.song?.title ?? "未知歌曲",
    artist: queueEntry.song?.artist ?? "未知",
    requester: queueEntry.requesterName,
    language: queueEntry.song?.language ?? "",
    tags: (queueEntry.song?.categories ?? []) as string[],
    vodUrl: null,
    timestampText: null,
    performedAt: new Date(),
  });

  // 4. Auto-promote next waiting song to playing
  const [nextWaiting] = await db
    .select()
    .from(queueTable)
    .where(eq(queueTable.status, "waiting"))
    .orderBy(asc(queueTable.position), asc(queueTable.createdAt))
    .limit(1);

  if (nextWaiting) {
    await db.update(queueTable)
      .set({ status: "playing" })
      .where(eq(queueTable.id, nextWaiting.id));
  }

  res.json(completedItem);
});

export default router;
