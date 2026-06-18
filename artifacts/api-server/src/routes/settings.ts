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
    siteName: "LY.city",
    siteSubtitle: "千羽織雪 Oriyuki｜歌回點歌系統",
    siteUrl: "https://ly.city",
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
    siteUrl: settings.siteUrl,
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
  if ((parsed.data as any).siteUrl !== undefined) updateData["siteUrl"] = (parsed.data as any).siteUrl;
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
    siteUrl: result.siteUrl,
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
