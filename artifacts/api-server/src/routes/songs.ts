import { Router, type IRouter } from "express";
import { eq, ilike, or, sql, desc } from "drizzle-orm";
import { db, songsTable } from "@workspace/db";
import {
  ListSongsQueryParams,
  CreateSongBody,
  GetSongParams,
  UpdateSongParams,
  UpdateSongBody,
  DeleteSongParams,
  ImportFromGoogleSheetBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/songs", async (req, res): Promise<void> => {
  const parsed = ListSongsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, language, category, page = 1, limit = 50 } = parsed.data;
  const offset = (page - 1) * limit;

  let query = db.select().from(songsTable);
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(songsTable.title, `%${search}%`),
        ilike(songsTable.artist, `%${search}%`)
      )
    );
  }
  if (language) {
    conditions.push(eq(songsTable.language, language));
  }
  if (category) {
    conditions.push(sql`${songsTable.categories} @> ${JSON.stringify([category])}::jsonb`);
  }

  const baseQuery = conditions.length > 0
    ? db.select().from(songsTable).where(conditions.length === 1 ? conditions[0] : sql`${conditions.map(c => sql`(${c})`).reduce((a, b) => sql`${a} AND ${b}`)}`)
    : db.select().from(songsTable);

  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(songsTable)
    .where(conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : sql`${conditions.map(c => sql`(${c})`).reduce((a, b) => sql`${a} AND ${b}`)}`)
      : undefined);

  const songs = await baseQuery.orderBy(desc(songsTable.createdAt)).limit(limit).offset(offset);
  const total = Number(totalResult[0]?.count ?? 0);

  res.json({ songs, total, page, limit });
});

router.post("/songs", async (req, res): Promise<void> => {
  const parsed = CreateSongBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [song] = await db.insert(songsTable).values({
    title: parsed.data.title,
    artist: parsed.data.artist,
    language: parsed.data.language ?? "日語",
    categories: parsed.data.categories ?? [],
    youtubeUrl: parsed.data.youtubeUrl ?? null,
    isPracticing: parsed.data.isPracticing ?? false,
    hasPitchWarning: parsed.data.hasPitchWarning ?? false,
  }).returning();

  res.status(201).json(song);
});

router.get("/songs/import/google-sheet", async (_req, res): Promise<void> => {
  res.status(405).json({ error: "Use POST" });
});

router.post("/songs/import/google-sheet", async (req, res): Promise<void> => {
  const parsed = ImportFromGoogleSheetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sheetUrl, sheetName } = parsed.data;

  // Convert Google Sheets URL to CSV export URL
  let csvUrl: string;
  try {
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      res.status(400).json({ error: "Invalid Google Sheet URL" });
      return;
    }
    const sheetId = match[1];
    const gidMatch = sheetUrl.match(/gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } catch {
    res.status(400).json({ error: "Invalid Google Sheet URL format" });
    return;
  }

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      res.status(400).json({ error: "Failed to fetch Google Sheet. Make sure it is publicly accessible." });
      return;
    }

    const csvText = await response.text();
    const lines = csvText.split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      res.json({ imported: 0, skipped: 0, errors: ["Sheet has no data rows"] });
      return;
    }

    // Parse header row
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const titleIdx = headers.findIndex(h => h.includes("歌名") || h.includes("title") || h.includes("song"));
    const artistIdx = headers.findIndex(h => h.includes("歌手") || h.includes("artist") || h.includes("singer"));
    const languageIdx = headers.findIndex(h => h.includes("語種") || h.includes("language") || h.includes("lang"));
    const youtubeIdx = headers.findIndex(h => h.includes("youtube") || h.includes("url") || h.includes("連結"));
    const practiceIdx = headers.findIndex(h => h.includes("修練") || h.includes("practice"));
    const pitchIdx = headers.findIndex(h => h.includes("破音") || h.includes("pitch"));
    const categoryIdx = headers.findIndex(h => h.includes("分類") || h.includes("category") || h.includes("tag"));

    if (titleIdx === -1 || artistIdx === -1) {
      res.json({ imported: 0, skipped: 0, errors: ["Could not find 歌名/title and 歌手/artist columns"] });
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const title = cols[titleIdx];
        const artist = cols[artistIdx];

        if (!title || !artist) {
          skipped++;
          continue;
        }

        const language = languageIdx >= 0 && cols[languageIdx] ? cols[languageIdx] : "日語";
        const youtubeUrl = youtubeIdx >= 0 && cols[youtubeIdx] ? cols[youtubeIdx] : null;
        const isPracticing = practiceIdx >= 0 && ["true", "yes", "1", "是", "✓"].includes(cols[practiceIdx]?.toLowerCase() ?? "");
        const hasPitchWarning = pitchIdx >= 0 && ["true", "yes", "1", "是", "✓"].includes(cols[pitchIdx]?.toLowerCase() ?? "");
        const categories = categoryIdx >= 0 && cols[categoryIdx]
          ? cols[categoryIdx].split(/[;｜|]/).map(c => c.trim()).filter(Boolean)
          : [];

        await db.insert(songsTable).values({
          title, artist, language,
          categories,
          youtubeUrl: youtubeUrl || null,
          isPracticing,
          hasPitchWarning,
        }).onConflictDoNothing();

        imported++;
      } catch {
        errors.push(`Row ${i + 1}: import failed`);
        skipped++;
      }
    }

    res.json({ imported, skipped, errors });
  } catch {
    res.status(500).json({ error: "Failed to import from Google Sheet" });
  }
});

router.get("/songs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetSongParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, parsed.data.id));
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }

  res.json(song);
});

router.patch("/songs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSongParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSongBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.artist !== undefined) updateData.artist = parsed.data.artist;
  if (parsed.data.language !== undefined) updateData.language = parsed.data.language;
  if (parsed.data.categories !== undefined) updateData.categories = parsed.data.categories;
  if (parsed.data.youtubeUrl !== undefined) updateData.youtubeUrl = parsed.data.youtubeUrl;
  if (parsed.data.isPracticing !== undefined) updateData.isPracticing = parsed.data.isPracticing;
  if (parsed.data.hasPitchWarning !== undefined) updateData.hasPitchWarning = parsed.data.hasPitchWarning;

  const [song] = await db.update(songsTable).set(updateData).where(eq(songsTable.id, params.data.id)).returning();
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }

  res.json(song);
});

router.delete("/songs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteSongParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [song] = await db.delete(songsTable).where(eq(songsTable.id, parsed.data.id)).returning();
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
