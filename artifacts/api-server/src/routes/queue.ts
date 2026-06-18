import { Router, type IRouter } from "express";
import { eq, asc, sql, inArray } from "drizzle-orm";
import { db, queueTable, songsTable, songHistoryTable, settingsTable, requesterStatsTable, songSessionsTable } from "@workspace/db";
import {
  AddToQueueBody,
  RemoveFromQueueParams,
  CompleteQueueItemParams,
  ReorderQueueBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

const songSelect = {
  id: songsTable.id,
  title: songsTable.title,
  artist: songsTable.artist,
  language: songsTable.language,
  playCount: songsTable.playCount,
  primaryTag: songsTable.primaryTag,
  categories: songsTable.categories,
  youtubeUrl: songsTable.youtubeUrl,
  isPracticing: songsTable.isPracticing,
  hasPitchWarning: songsTable.hasPitchWarning,
  createdAt: songsTable.createdAt,
  cooldownDays: songsTable.cooldownDays,
  cooldownMode: songsTable.cooldownMode,
  lyricsText: songsTable.lyricsText,
  lyricsFormat: songsTable.lyricsFormat,
  lyricsSource: songsTable.lyricsSource,
  lyricsUpdatedAt: songsTable.lyricsUpdatedAt,
};

async function isTestMode(): Promise<boolean> {
  const rows = await db.select({ testMode: settingsTable.testMode }).from(settingsTable).limit(1);
  return rows[0]?.testMode ?? false;
}

async function getActiveSessionId(): Promise<number | null> {
  const [session] = await db
    .select({ id: songSessionsTable.id })
    .from(songSessionsTable)
    .where(eq(songSessionsTable.isActive, true))
    .limit(1);
  return session?.id ?? null;
}

// Only show active (waiting/playing) items — excludes completed and skipped
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
      startedAt: queueTable.startedAt,
      completedAt: queueTable.completedAt,
      sessionId: queueTable.sessionId,
      song: songSelect,
    })
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(inArray(queueTable.status, ["waiting", "playing"]))
    .orderBy(asc(queueTable.position), asc(queueTable.createdAt));
}

// Upsert requester stats when someone adds to queue
async function upsertRequesterStats(requesterName: string) {
  await db
    .insert(requesterStatsTable)
    .values({ requesterName, requestCount: 1, lastRequestAt: new Date() })
    .onConflictDoUpdate({
      target: requesterStatsTable.requesterName,
      set: {
        requestCount: sql`${requesterStatsTable.requestCount} + 1`,
        lastRequestAt: new Date(),
      },
    });
}

// Static/special routes MUST come before parameterised /:id routes

router.get("/queue", async (_req, res): Promise<void> => {
  const items = await getActiveQueueWithSongs();
  res.json({ items, total: items.length });
});

router.post("/queue", async (req, res): Promise<void> => {
  const parsed = AddToQueueBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, parsed.data.songId));
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }

  const existing = await db
    .select({ position: queueTable.position })
    .from(queueTable)
    .where(inArray(queueTable.status, ["waiting", "playing"]))
    .orderBy(asc(queueTable.position));

  const maxPosition = existing.length > 0 ? Math.max(...existing.map(e => e.position)) + 1 : 0;

  // Enforce note max length (100 chars)
  const note = parsed.data.note ? parsed.data.note.slice(0, 100) : null;

  const [item] = await db.insert(queueTable).values({
    songId: parsed.data.songId,
    requesterName: parsed.data.requesterName,
    note,
    position: maxPosition,
    status: "waiting",
  }).returning();

  // Track requester stats (fire-and-forget, don't fail request on error)
  upsertRequesterStats(parsed.data.requesterName).catch(() => undefined);

  res.status(201).json({ ...item, song });
});

router.patch("/queue/reorder", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ReorderQueueBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  for (let i = 0; i < parsed.data.orderedIds.length; i++) {
    await db.update(queueTable).set({ position: i }).where(eq(queueTable.id, parsed.data.orderedIds[i]));
  }
  const items = await getActiveQueueWithSongs();
  res.json({ items, total: items.length });
});

router.get("/queue/current", async (_req, res): Promise<void> => {
  const fields = {
    id: queueTable.id,
    songId: queueTable.songId,
    requesterName: queueTable.requesterName,
    note: queueTable.note,
    position: queueTable.position,
    status: queueTable.status,
    createdAt: queueTable.createdAt,
    startedAt: queueTable.startedAt,
    completedAt: queueTable.completedAt,
    sessionId: queueTable.sessionId,
    song: songSelect,
  };

  const playingItems = await db
    .select(fields)
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(eq(queueTable.status, "playing"))
    .orderBy(asc(queueTable.createdAt))
    .limit(1);

  const waitingItems = await db
    .select(fields)
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(eq(queueTable.status, "waiting"))
    .orderBy(asc(queueTable.position), asc(queueTable.createdAt))
    .limit(2);

  const current = playingItems[0] ?? waitingItems[0] ?? null;
  const next = playingItems.length > 0 ? (waitingItems[0] ?? null) : (waitingItems[1] ?? null);

  res.json({ current, next });
});

// OBS lyrics current state endpoint
router.get("/obs/lyrics/current", async (_req, res): Promise<void> => {
  const [playing] = await db
    .select({
      id: queueTable.id,
      requesterName: queueTable.requesterName,
      note: queueTable.note,
      startedAt: queueTable.startedAt,
      songTitle: songsTable.title,
      songArtist: songsTable.artist,
      lyricsText: songsTable.lyricsText,
      lyricsFormat: songsTable.lyricsFormat,
    })
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(eq(queueTable.status, "playing"))
    .orderBy(asc(queueTable.createdAt))
    .limit(1);

  if (!playing) {
    res.json({ hasCurrentSong: false, song: null, startedAt: null, lyricsText: null, lyricsFormat: null, requester: null, requestNote: null });
    return;
  }

  res.json({
    hasCurrentSong: true,
    song: { title: playing.songTitle ?? "", artist: playing.songArtist ?? "" },
    startedAt: playing.startedAt?.toISOString() ?? null,
    lyricsText: playing.lyricsText,
    lyricsFormat: playing.lyricsFormat,
    requester: playing.requesterName,
    requestNote: playing.note,
  });
});

router.delete("/queue/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = RemoveFromQueueParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.delete(queueTable).where(eq(queueTable.id, parsed.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Queue item not found" }); return; }
  res.sendStatus(204);
});

// V2 compat: sets playing, auto-demotes existing playing to waiting
router.patch("/queue/:id/play", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(queueTable).set({ status: "waiting" }).where(eq(queueTable.status, "playing"));
  const [item] = await db.update(queueTable).set({ status: "playing" }).where(eq(queueTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Queue item not found" }); return; }
  const [song] = await db.select(songSelect).from(songsTable).where(eq(songsTable.id, item.songId));
  res.json({ ...item, song: song ?? null });
});

// V3: explicit "開始演唱" — sets started_at, assigns session_id, does NOT auto-demote
router.patch("/queue/:id/start", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const sessionId = await getActiveSessionId();

  const [item] = await db
    .update(queueTable)
    .set({
      status: "playing",
      startedAt: new Date(),
      sessionId: sessionId ?? null,
    })
    .where(eq(queueTable.id, id))
    .returning();

  if (!item) { res.status(404).json({ error: "Queue item not found" }); return; }

  const [song] = await db.select(songSelect).from(songsTable).where(eq(songsTable.id, item.songId));
  res.json({ ...item, song: song ?? null });
});

router.patch("/queue/:id/skip", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const noAutoPromote = req.query.noAutoPromote === "true";

  const [item] = await db.update(queueTable)
    .set({ status: "skipped" })
    .where(eq(queueTable.id, id))
    .returning();

  if (!item) { res.status(404).json({ error: "Queue item not found" }); return; }

  // V2 compat: auto-promote next waiting song (unless V3 noAutoPromote flag)
  if (!noAutoPromote) {
    const [nextWaiting] = await db.select().from(queueTable)
      .where(eq(queueTable.status, "waiting"))
      .orderBy(asc(queueTable.position), asc(queueTable.createdAt))
      .limit(1);
    if (nextWaiting) {
      await db.update(queueTable).set({ status: "playing" }).where(eq(queueTable.id, nextWaiting.id));
    }
  }

  res.json(item);
});

router.patch("/queue/:id/complete", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = CompleteQueueItemParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const noAutoPromote = req.query.noAutoPromote === "true";

  const [queueEntry] = await db
    .select({
      id: queueTable.id,
      songId: queueTable.songId,
      requesterName: queueTable.requesterName,
      note: queueTable.note,
      position: queueTable.position,
      status: queueTable.status,
      createdAt: queueTable.createdAt,
      startedAt: queueTable.startedAt,
      sessionId: queueTable.sessionId,
      song: songSelect,
    })
    .from(queueTable)
    .leftJoin(songsTable, eq(queueTable.songId, songsTable.id))
    .where(eq(queueTable.id, parsed.data.id));

  if (!queueEntry) { res.status(404).json({ error: "Queue item not found" }); return; }

  const [completedItem] = await db.update(queueTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(queueTable.id, parsed.data.id))
    .returning();

  const testMode = await isTestMode();

  if (!testMode) {
    await db.update(songsTable)
      .set({ playCount: sql`${songsTable.playCount} + 1` })
      .where(eq(songsTable.id, queueEntry.songId));

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
      sessionId: queueEntry.sessionId ?? null,
      requestNote: queueEntry.note ?? null,
      lyricsSource: queueEntry.song?.lyricsSource ?? null,
    });
  }

  // V2 compat: auto-promote next waiting song (unless V3 noAutoPromote flag)
  if (!noAutoPromote) {
    const [nextWaiting] = await db.select().from(queueTable)
      .where(eq(queueTable.status, "waiting"))
      .orderBy(asc(queueTable.position), asc(queueTable.createdAt))
      .limit(1);
    if (nextWaiting) {
      await db.update(queueTable).set({ status: "playing" }).where(eq(queueTable.id, nextWaiting.id));
    }
  }

  res.json({ ...completedItem, testMode });
});

export default router;
