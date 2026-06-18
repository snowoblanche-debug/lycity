import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, songsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

// ── LrcLib search ───────────────────────────────────────────────────────────
interface LrcLibResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

async function searchLrcLib(title: string, artist: string): Promise<LrcLibResult[]> {
  const q = encodeURIComponent(`${title} ${artist}`);
  const resp = await fetch(`https://lrclib.net/api/search?q=${q}`, {
    headers: { "User-Agent": "LY.city/3.0 (https://ly.city)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return [];
  const data = await resp.json() as LrcLibResult[];
  return Array.isArray(data) ? data.slice(0, 5) : [];
}

// ── NetEase search ──────────────────────────────────────────────────────────
interface NetEaseSong {
  id: number;
  name: string;
  artists: Array<{ name: string }>;
  duration: number;
}

interface NetEaseSearchResponse {
  code: number;
  result?: {
    songs?: NetEaseSong[];
  };
}

interface NetEaseLyricResponse {
  code: number;
  lrc?: { lyric: string };
}

async function searchNetEase(title: string, artist: string): Promise<Array<{ id: number; name: string; artist: string; duration: number }>> {
  const q = encodeURIComponent(`${title} ${artist}`);
  try {
    const resp = await fetch(
      `https://music.163.com/api/search/get/web?s=${q}&type=1&offset=0&total=true&limit=5`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Referer": "https://music.163.com/",
          "Cookie": "os=pc",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!resp.ok) return [];
    const data = await resp.json() as NetEaseSearchResponse;
    if (data.code !== 200 || !data.result?.songs) return [];
    return data.result.songs.map(s => ({
      id: s.id,
      name: s.name,
      artist: s.artists.map(a => a.name).join(", "),
      duration: Math.round(s.duration / 1000),
    }));
  } catch {
    return [];
  }
}

async function getNetEaseLyrics(songId: number): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Referer": "https://music.163.com/",
          "Cookie": "os=pc",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json() as NetEaseLyricResponse;
    return data.lrc?.lyric ?? null;
  } catch {
    return null;
  }
}

function getPreviewLines(text: string, count = 10): string[] {
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.match(/^\[(?:ar|al|ti|by|offset|length|re|ve):/i))
    .slice(0, count);
}

// ── Routes ──────────────────────────────────────────────────────────────────

router.get("/songs/:id/lyrics", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [song] = await db
    .select({
      id: songsTable.id,
      lyricsText: songsTable.lyricsText,
      lyricsFormat: songsTable.lyricsFormat,
      lyricsSource: songsTable.lyricsSource,
      lyricsUpdatedAt: songsTable.lyricsUpdatedAt,
    })
    .from(songsTable)
    .where(eq(songsTable.id, id));

  if (!song) { res.status(404).json({ error: "Song not found" }); return; }

  res.json({
    songId: song.id,
    lyricsText: song.lyricsText,
    lyricsFormat: song.lyricsFormat,
    lyricsSource: song.lyricsSource,
    lyricsUpdatedAt: song.lyricsUpdatedAt,
  });
});

router.patch("/songs/:id/lyrics", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { lyricsText, lyricsFormat, lyricsSource } = req.body as {
    lyricsText?: string;
    lyricsFormat?: string;
    lyricsSource?: string;
  };

  if (!lyricsText || !lyricsFormat || !lyricsSource) {
    res.status(400).json({ error: "lyricsText, lyricsFormat, and lyricsSource are required" }); return;
  }

  const [updated] = await db
    .update(songsTable)
    .set({
      lyricsText,
      lyricsFormat,
      lyricsSource,
      lyricsUpdatedAt: new Date(),
    })
    .where(eq(songsTable.id, id))
    .returning({
      id: songsTable.id,
      lyricsText: songsTable.lyricsText,
      lyricsFormat: songsTable.lyricsFormat,
      lyricsSource: songsTable.lyricsSource,
      lyricsUpdatedAt: songsTable.lyricsUpdatedAt,
    });

  if (!updated) { res.status(404).json({ error: "Song not found" }); return; }

  res.json({ songId: updated.id, ...updated });
});

router.delete("/songs/:id/lyrics", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [updated] = await db
    .update(songsTable)
    .set({ lyricsText: null, lyricsFormat: null, lyricsSource: null, lyricsUpdatedAt: null })
    .where(eq(songsTable.id, id))
    .returning({ id: songsTable.id });

  if (!updated) { res.status(404).json({ error: "Song not found" }); return; }
  res.sendStatus(204);
});

router.post("/songs/:id/lyrics/search", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [song] = await db
    .select({ id: songsTable.id, title: songsTable.title, artist: songsTable.artist })
    .from(songsTable)
    .where(eq(songsTable.id, id));
  if (!song) { res.status(404).json({ error: "Song not found" }); return; }

  const { provider = "auto", title: overrideTitle, artist: overrideArtist } = req.body as {
    provider?: string;
    title?: string;
    artist?: string;
  };

  const searchTitle = overrideTitle || song.title;
  const searchArtist = overrideArtist || song.artist;

  const results: Array<{
    provider: string;
    lyricsText: string;
    lyricsFormat: string;
    duration: number | null;
    previewLines: string[];
  }> = [];

  // Search LrcLib
  if (provider === "lrclib" || provider === "auto") {
    try {
      const lrcResults = await searchLrcLib(searchTitle, searchArtist);
      for (const item of lrcResults.slice(0, 2)) {
        const text = item.syncedLyrics ?? item.plainLyrics;
        if (text) {
          results.push({
            provider: "lrclib",
            lyricsText: text,
            lyricsFormat: item.syncedLyrics ? "lrc" : "plain",
            duration: item.duration,
            previewLines: getPreviewLines(text),
          });
        }
      }
    } catch {
      // LrcLib unavailable — skip silently
    }
  }

  // Search NetEase
  if (provider === "netease" || provider === "auto") {
    try {
      const neSongs = await searchNetEase(searchTitle, searchArtist);
      for (const neSong of neSongs.slice(0, 2)) {
        const lyric = await getNetEaseLyrics(neSong.id);
        if (lyric && lyric.trim()) {
          results.push({
            provider: "netease",
            lyricsText: lyric,
            lyricsFormat: "lrc",
            duration: neSong.duration,
            previewLines: getPreviewLines(lyric),
          });
          break; // One NetEase result is enough
        }
      }
    } catch {
      // NetEase unavailable — skip silently
    }
  }

  res.json({ results });
});

export default router;
