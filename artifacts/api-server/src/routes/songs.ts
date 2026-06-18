import { Router, type IRouter } from "express";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
import { db, songsTable, songHistoryTable } from "@workspace/db";
import {
  ListSongsQueryParams,
  CreateSongBody,
  GetSongParams,
  UpdateSongParams,
  UpdateSongBody,
  DeleteSongParams,
  ImportFromGoogleSheetBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

// Proper CSV line parser — handles quoted fields containing commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse tags: "#抒情,#RAP" or "抒情, RAP" → ["抒情", "RAP"]
function parseTags(raw: string): string[] {
  return raw.split(/[,，]/).map(t => t.trim().replace(/^#/, "")).filter(Boolean);
}

// Resolve column indices — tries headers first, falls back to positional
function resolveColumns(headers: string[]) {
  const h = headers.map(v => v.toLowerCase());
  const find = (terms: string[], fallback: number) => {
    const idx = h.findIndex(v => terms.some(t => v.includes(t)));
    return idx !== -1 ? idx : fallback;
  };
  return {
    titleIdx:    find(["歌名", "title", "song"], 0),
    artistIdx:   find(["歌手", "artist", "singer"], 1),
    languageIdx: find(["語種", "language", "lang"], 2),
    tagsIdx:     find(["標籤", "tag", "分類", "category"], 3),
    statusIdx:   find(["狀態", "status", "state"], 4),
    youtubeIdx:  find(["youtube", "url", "連結"], -1),
  };
}

// Shared: fetch CSV and return parsed columns + data rows
async function fetchSheet(sheetUrl: string) {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error("無效的 Google Sheet 網址");
  const sheetId = match[1];
  const gid = (sheetUrl.match(/gid=(\d+)/) ?? [])[1] ?? "0";
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error("無法讀取 Google Sheet，請確認分享設定為「知道連結的使用者皆可檢視」");

  const text = await response.text();
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return { cols: null, dataLines: [], rowsDetected: 0 };

  const cols = resolveColumns(parseCSVLine(lines[0]));
  const dataLines = lines.slice(1);
  return { cols, dataLines, rowsDetected: dataLines.length };
}

// YouTube title parsing helpers
function cleanYouTubeTitle(title: string): string {
  let t = title;
  // Remove bracketed junk: 【...】,（...）,(...) containing common terms
  t = t.replace(/[【（(【\[][^\]】）)]*(?:Cover|Lyrics|動態歌詞|Official\s*(?:Video|MV|Audio)|MV|Karaoke|カラオケ|翻唱|原唱|伴奏|歌詞|字幕|HD|4K)[^\]】）)]*[\]】）)]/gi, "");
  // Remove trailing patterns
  const patterns: RegExp[] = [
    /[\s\-–|｜]+(?:Official\s+)?(?:Music\s+Video|Video|MV|Audio)$/gi,
    /[\s\-–|｜]+Lyrics?$/gi,
    /[\s\-–|｜]+動態歌詞$/g,
    /[\s\-–|｜]+Cover$/gi,
    /[\s\-–|｜]+Karaoke$/gi,
    /[\s\-–|｜]+原唱$/g,
    /[\s\-–|｜]+翻唱$/g,
    /[\s\-–|｜]+伴奏$/g,
    /[\s\-–|｜]+歌詞$/g,
  ];
  for (const p of patterns) t = t.replace(p, "");
  return t.trim();
}

function parseYouTubeTitle(rawTitle: string, channelName: string): { songTitle: string; artist: string } {
  const cleaned = cleanYouTubeTitle(rawTitle);

  // Try "Artist - Song Title" or "Song - Artist" split on " - "
  const dashMatch = cleaned.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (dashMatch) {
    const [, left, right] = dashMatch;
    const cleanLeft = cleanYouTubeTitle(left.trim());
    const cleanRight = cleanYouTubeTitle(right.trim());

    // If channel name strongly matches left → left is artist, right is song
    const channelNorm = channelName.toLowerCase().replace(/\s*(official|records|music|vevo|channel)\s*/gi, "").trim();
    const leftNorm = cleanLeft.toLowerCase();
    if (channelNorm.length >= 3 && leftNorm.includes(channelNorm.substring(0, Math.min(5, channelNorm.length)))) {
      return { songTitle: cleanRight, artist: cleanLeft };
    }
    // Default: assume "Artist - Song"
    return { songTitle: cleanRight, artist: cleanLeft };
  }

  // Try "Song / Artist" split
  const slashMatch = cleaned.match(/^(.+?)\s*[/／]\s*(.+)$/);
  if (slashMatch) {
    return {
      songTitle: cleanYouTubeTitle(slashMatch[1].trim()),
      artist: cleanYouTubeTitle(slashMatch[2].trim()),
    };
  }

  // Fallback: full title as song name, clean channel as artist
  const cleanChannel = channelName
    .replace(/\s*(Official|Records|Music|VEVO|Channel|JP|official)\s*/gi, "")
    .trim();
  return { songTitle: cleaned, artist: cleanChannel };
}

// --- Routes ---

router.get("/songs", async (req, res): Promise<void> => {
  const parsed = ListSongsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { search, language, category, page = 1, limit = 50 } = parsed.data;
  const primaryTag = (req.query as Record<string, string>)["primaryTag"] as string | undefined;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (search) {
    conditions.push(or(
      ilike(songsTable.title, `%${search}%`),
      ilike(songsTable.artist, `%${search}%`),
      sql`${songsTable.categories}::text ilike ${'%' + search + '%'}`,
    ) as any);
  }
  if (language) conditions.push(eq(songsTable.language, language) as any);
  if (category) {
    // Match against both categories array and primaryTag
    conditions.push(or(
      sql`${songsTable.categories} @> ${JSON.stringify([category])}::jsonb`,
      eq(songsTable.primaryTag, category),
    ) as any);
  }
  if (primaryTag) conditions.push(eq(songsTable.primaryTag, primaryTag) as any);

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(songsTable).where(where);
  const songs = await db.select().from(songsTable).where(where).orderBy(desc(songsTable.createdAt)).limit(limit).offset(offset);

  res.json({ songs, total: Number(count ?? 0), page, limit });
});

router.post("/songs", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateSongBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const status = (req.body.status as string) ?? "已解鎖";
  const [song] = await db.insert(songsTable).values({
    title: parsed.data.title,
    artist: parsed.data.artist,
    language: parsed.data.language ?? "日語",
    status,
    primaryTag: (parsed.data as any).primaryTag ?? null,
    categories: parsed.data.categories ?? [],
    youtubeUrl: parsed.data.youtubeUrl ?? null,
    isPracticing: parsed.data.isPracticing ?? status.includes("修練"),
    hasPitchWarning: parsed.data.hasPitchWarning ?? false,
  }).returning();

  res.status(201).json(song);
});

// Analyze YouTube URL — returns metadata suggestions (public endpoint, no auth needed)
router.post("/songs/analyze-url", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    res.status(400).json({ error: "請提供有效的 YouTube 網址" });
    return;
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  let oembedData: { title: string; author_name: string; thumbnail_url: string };

  try {
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      res.status(400).json({ error: "無法取得影片資訊，請確認影片公開且網址正確" });
      return;
    }
    oembedData = await response.json() as typeof oembedData;
  } catch {
    res.status(400).json({ error: "無法連線至 YouTube，請稍後再試" });
    return;
  }

  const { songTitle, artist } = parseYouTubeTitle(oembedData.title, oembedData.author_name);

  // Duplicate check — find songs with similar title
  const titleSearch = songTitle.substring(0, Math.min(songTitle.length, 10));
  const similarSongs = await db.select()
    .from(songsTable)
    .where(ilike(songsTable.title, `%${titleSearch}%`))
    .limit(5);

  res.json({
    rawTitle: oembedData.title,
    channelName: oembedData.author_name,
    thumbnailUrl: oembedData.thumbnail_url,
    youtubeUrl: url,
    suggestedTitle: songTitle,
    suggestedArtist: artist,
    similarSongs,
  });
});

// Preview MUST come before /import/google-sheet (longer path first)
router.post("/songs/import/google-sheet/preview", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ImportFromGoogleSheetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  try {
    const { cols, dataLines, rowsDetected } = await fetchSheet(parsed.data.sheetUrl);
    if (!cols || dataLines.length === 0) {
      res.json({ rowsDetected: 0, newSongs: 0, updatedSongs: 0, skippedSongs: 0, errors: [] });
      return;
    }

    const existing = new Set(
      (await db.select({ title: songsTable.title, artist: songsTable.artist }).from(songsTable))
        .map(r => `${r.title.toLowerCase()}|||${r.artist.toLowerCase()}`)
    );

    let newSongs = 0, updatedSongs = 0, skippedSongs = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const row = parseCSVLine(dataLines[i]);
        const title = row[cols.titleIdx]?.trim();
        if (!title) { skippedSongs++; if (row.some(c => c.trim())) errors.push(`第 ${i + 2} 行：歌名為空`); continue; }
        const artist = row[cols.artistIdx]?.trim() ?? "";
        const key = `${title.toLowerCase()}|||${artist.toLowerCase()}`;
        if (existing.has(key)) updatedSongs++; else newSongs++;
      } catch { skippedSongs++; errors.push(`第 ${i + 2} 行：解析失敗`); }
    }

    res.json({ rowsDetected, newSongs, updatedSongs, skippedSongs, errors });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Preview failed" });
  }
});

router.post("/songs/import/google-sheet", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ImportFromGoogleSheetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  try {
    const { cols, dataLines, rowsDetected } = await fetchSheet(parsed.data.sheetUrl);
    if (!cols || dataLines.length === 0) {
      res.json({ rowsDetected: 0, imported: 0, updated: 0, skipped: 0, errors: ["試算表中沒有資料列"] });
      return;
    }

    let imported = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const row = parseCSVLine(dataLines[i]);
        const title = row[cols.titleIdx]?.trim();
        const artist = row[cols.artistIdx]?.trim() ?? "";

        if (!title) {
          skipped++;
          if (row.some(c => c.trim())) errors.push(`第 ${i + 2} 行：歌名為空，已略過`);
          continue;
        }

        const language = row[cols.languageIdx]?.trim() || "日語";
        const tags = parseTags(row[cols.tagsIdx]?.trim() ?? "");
        const status = row[cols.statusIdx]?.trim() || "已解鎖";
        const youtubeUrl = cols.youtubeIdx >= 0 ? (row[cols.youtubeIdx]?.trim() || null) : null;
        const isPracticing = status.includes("修練") || tags.includes("修練中");
        const hasPitchWarning = tags.some(t => t.includes("破音"));

        const [existing] = await db.select({ id: songsTable.id })
          .from(songsTable)
          .where(and(
            sql`lower(${songsTable.title}) = lower(${title})`,
            sql`lower(${songsTable.artist}) = lower(${artist})`
          ));

        if (existing) {
          await db.update(songsTable)
            .set({ language, categories: tags, status, youtubeUrl, isPracticing, hasPitchWarning })
            .where(eq(songsTable.id, existing.id));
          updated++;
        } else {
          await db.insert(songsTable).values({ title, artist, language, categories: tags, status, youtubeUrl, isPracticing, hasPitchWarning });
          imported++;
        }
      } catch {
        errors.push(`第 ${i + 2} 行：匯入失敗`);
        skipped++;
      }
    }

    res.json({ rowsDetected, imported, updated, skipped, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to import from Google Sheet" });
  }
});

router.get("/songs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetSongParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, parsed.data.id));
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }
  res.json(song);
});

router.patch("/songs/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSongParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSongBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const u: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) u.title = parsed.data.title;
  if (parsed.data.artist !== undefined) u.artist = parsed.data.artist;
  if (parsed.data.language !== undefined) u.language = parsed.data.language;
  if (req.body.status !== undefined) u.status = req.body.status;
  if ((parsed.data as any).primaryTag !== undefined) u.primaryTag = (parsed.data as any).primaryTag;
  if (parsed.data.categories !== undefined) u.categories = parsed.data.categories;
  if (parsed.data.youtubeUrl !== undefined) u.youtubeUrl = parsed.data.youtubeUrl;
  if (parsed.data.isPracticing !== undefined) u.isPracticing = parsed.data.isPracticing;
  if (parsed.data.hasPitchWarning !== undefined) u.hasPitchWarning = parsed.data.hasPitchWarning;

  const [song] = await db.update(songsTable).set(u).where(eq(songsTable.id, params.data.id)).returning();
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }
  res.json(song);
});

router.delete("/songs/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteSongParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [song] = await db.delete(songsTable).where(eq(songsTable.id, parsed.data.id)).returning();
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }
  res.sendStatus(204);
});

// V3: cooldown status — MUST come after /songs/:id routes but path is distinct
router.get("/songs/:id/cooldown", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [song] = await db
    .select({ cooldownDays: songsTable.cooldownDays, cooldownMode: songsTable.cooldownMode })
    .from(songsTable)
    .where(eq(songsTable.id, id));
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }

  const [lastHistory] = await db
    .select({ performedAt: songHistoryTable.performedAt })
    .from(songHistoryTable)
    .where(eq(songHistoryTable.songId, id))
    .orderBy(desc(songHistoryTable.performedAt))
    .limit(1);

  const lastPerformed = lastHistory?.performedAt ?? null;
  const cooldownDays = song.cooldownDays ?? 0;
  let remainingDays = 0;
  let isInCooldown = false;

  if (lastPerformed && cooldownDays > 0) {
    const daysSince = (Date.now() - lastPerformed.getTime()) / (1000 * 60 * 60 * 24);
    remainingDays = Math.max(0, Math.ceil(cooldownDays - daysSince));
    isInCooldown = remainingDays > 0;
  }

  res.json({
    cooldownDays,
    cooldownMode: song.cooldownMode ?? "warn",
    lastPerformed: lastPerformed?.toISOString() ?? null,
    remainingDays,
    isInCooldown,
  });
});

// V3: update cooldown settings for a song
router.patch("/songs/:id/cooldown", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { cooldownDays, cooldownMode } = req.body as { cooldownDays?: number; cooldownMode?: string };
  const updates: Record<string, unknown> = {};
  if (cooldownDays !== undefined) updates.cooldownDays = Math.max(0, cooldownDays);
  if (cooldownMode === "warn" || cooldownMode === "block") updates.cooldownMode = cooldownMode;

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }

  const [song] = await db.update(songsTable).set(updates).where(eq(songsTable.id, id)).returning();
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }
  res.json(song);
});

export default router;
