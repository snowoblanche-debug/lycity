import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [settings] = await db.insert(settingsTable).values({
    siteName: "聆櫻聖境的點歌旋律",
    siteSubtitle: "點播喜歡的歌曲，一起留下今晚的旋律",
    bannerImageUrl: null,
    bannerText: null,
    testMode: false,
  }).returning();
  return settings;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({
    bannerImageUrl: settings.bannerImageUrl,
    siteName: settings.siteName,
    siteSubtitle: settings.siteSubtitle,
    bannerText: settings.bannerText,
    obsKeyEnabled: !!settings.obsKey,
    testMode: settings.testMode,
  });
});

router.patch("/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settings = await getOrCreateSettings();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.bannerImageUrl !== undefined) updateData["bannerImageUrl"] = parsed.data.bannerImageUrl;
  if (parsed.data.siteName !== undefined) updateData["siteName"] = parsed.data.siteName;
  if (parsed.data.siteSubtitle !== undefined) updateData["siteSubtitle"] = parsed.data.siteSubtitle;
  if (parsed.data.bannerText !== undefined) updateData["bannerText"] = parsed.data.bannerText;
  if ((req.body as { obsKey?: string | null }).obsKey !== undefined) {
    updateData["obsKey"] = (req.body as { obsKey?: string | null }).obsKey || null;
  }
  if ((req.body as { testMode?: boolean }).testMode !== undefined) {
    updateData["testMode"] = !!(req.body as { testMode?: boolean }).testMode;
  }

  const [updated] = await db.update(settingsTable)
    .set(updateData)
    .where(eq(settingsTable.id, settings.id))
    .returning();

  const result = updated ?? settings;

  res.json({
    bannerImageUrl: result.bannerImageUrl,
    siteName: result.siteName,
    siteSubtitle: result.siteSubtitle,
    bannerText: result.bannerText,
    obsKeyEnabled: !!result.obsKey,
    testMode: result.testMode,
  });
});

// Public OBS key verification
router.get("/obs/verify", async (req, res): Promise<void> => {
  const key = req.query["key"] as string | undefined;
  const rows = await db.select({ obsKey: settingsTable.obsKey }).from(settingsTable).limit(1);
  const storedKey = rows[0]?.obsKey;
  if (!storedKey) {
    res.json({ valid: true });
    return;
  }
  res.json({ valid: key === storedKey });
});

export default router;
