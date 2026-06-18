import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, songSessionsTable, songHistoryTable, queueTable } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

router.get("/sessions/active", async (_req, res): Promise<void> => {
  const [session] = await db
    .select()
    .from(songSessionsTable)
    .where(eq(songSessionsTable.isActive, true))
    .limit(1);
  res.json({ session: session ?? null });
});

router.get("/sessions", requireAdmin, async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(songSessionsTable)
    .orderBy(desc(songSessionsTable.createdAt));
  res.json({ sessions });
});

router.get("/sessions/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [session] = await db
    .select()
    .from(songSessionsTable)
    .where(eq(songSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const setlist = await db
    .select()
    .from(songHistoryTable)
    .where(eq(songHistoryTable.sessionId, id))
    .orderBy(asc(songHistoryTable.performedAt));

  res.json({ session, setlist, songCount: setlist.length });
});

router.post("/sessions", requireAdmin, async (req, res): Promise<void> => {
  const { title, description } = req.body as { title?: string; description?: string };
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" }); return;
  }

  // Deactivate any existing active session first
  await db
    .update(songSessionsTable)
    .set({ isActive: false, endedAt: new Date() })
    .where(eq(songSessionsTable.isActive, true));

  const [session] = await db
    .insert(songSessionsTable)
    .values({
      title: title.trim(),
      description: description ?? null,
      isActive: true,
      startedAt: new Date(),
    })
    .returning();

  res.status(201).json(session);
});

router.patch("/sessions/:id/end", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [session] = await db
    .select()
    .from(songSessionsTable)
    .where(eq(songSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  // Check if any queue item is currently playing
  const [playingItem] = await db
    .select({ id: queueTable.id })
    .from(queueTable)
    .where(eq(queueTable.status, "playing"))
    .limit(1);

  if (playingItem) {
    res.status(409).json({
      error: "目前有歌曲正在演唱中，請先完唱或跳過後再結束歌回。",
      code: "SONG_IN_PROGRESS",
    });
    return;
  }

  const [updated] = await db
    .update(songSessionsTable)
    .set({ isActive: false, endedAt: new Date() })
    .where(eq(songSessionsTable.id, id))
    .returning();

  res.json(updated);
});

router.delete("/sessions/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [session] = await db
    .select()
    .from(songSessionsTable)
    .where(eq(songSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  await db.delete(songSessionsTable).where(eq(songSessionsTable.id, id));
  res.sendStatus(204);
});

router.get("/sessions/:id/export", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [session] = await db
    .select()
    .from(songSessionsTable)
    .where(eq(songSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const setlist = await db
    .select()
    .from(songHistoryTable)
    .where(eq(songHistoryTable.sessionId, id))
    .orderBy(asc(songHistoryTable.performedAt));

  const lines = setlist.map((h, i) => `${i + 1}. ${h.songTitle} — ${h.artist}`);
  const text = [session.title, "", ...lines].join("\n");

  res.json({ title: session.title, text, songCount: setlist.length });
});

export default router;
