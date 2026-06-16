import { Router, type IRouter } from "express";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
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

// --- Routes ---

router.get("/songs", async (req, res): Promise<void> => {
  const parsed = ListSongsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { search, language, category, page = 1, limit = 50 } = parsed.data;
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
  if (category) conditions.push(sql`${songsTable.categories} @> ${JSON.stringify([category])}::jsonb` as any);

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(songsTable).where(where);
  const songs = await db.select().from(songsTable).where(where).orderBy(desc(songsTable.createdAt)).limit(limit).offset(offset);

  res.json({ songs, total: Number(count ?? 0), page, limit });
});

router.post("/songs", async (req, res): Promise<void> => {
  const parsed = CreateSongBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const status = (req.body.status as string) ?? "已解鎖";
  const [song] = await db.insert(songsTable).values({
    title: parsed.data.title,
    artist: parsed.data.artist,
    language: parsed.data.language ?? "日語",
    status,
    categories: parsed.data.categories ?? [],
    youtubeUrl: parsed.data.youtubeUrl ?? null,
    isPracticing: parsed.data.isPracticing ?? status.includes("修練"),
    hasPitchWarning: parsed.data.hasPitchWarning ?? false,
  }).returning();

  res.status(201).json(song);
});

// Preview MUST come before /import/google-sheet (longer path first)
router.post("/songs/import/google-sheet/preview", async (req, res): Promise<void> => {
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

router.post("/songs/import/google-sheet", async (req, res): Promise<void> => {
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

router.patch("/songs/:id", async (req, res): Promise<void> => {
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
  if (parsed.data.categories !== undefined) u.categories = parsed.data.categories;
  if (parsed.data.youtubeUrl !== undefined) u.youtubeUrl = parsed.data.youtubeUrl;
  if (parsed.data.isPracticing !== undefined) u.isPracticing = parsed.data.isPracticing;
  if (parsed.data.hasPitchWarning !== undefined) u.hasPitchWarning = parsed.data.hasPitchWarning;

  const [song] = await db.update(songsTable).set(u).where(eq(songsTable.id, params.data.id)).returning();
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }
  res.json(song);
});

router.delete("/songs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteSongParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [song] = await db.delete(songsTable).where(eq(songsTable.id, parsed.data.id)).returning();
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }
  res.sendStatus(204);
});

export default router;
