import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [settings] = await db.insert(settingsTable).values({
    siteName: "聆櫻聖境的點歌旋律",
    bannerImageUrl: null,
    bannerText: null,
  }).returning();
  return settings;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({
    bannerImageUrl: settings.bannerImageUrl,
    siteName: settings.siteName,
    bannerText: settings.bannerText,
  });
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settings = await getOrCreateSettings();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.bannerImageUrl !== undefined) updateData.bannerImageUrl = parsed.data.bannerImageUrl;
  if (parsed.data.siteName !== undefined) updateData.siteName = parsed.data.siteName;
  if (parsed.data.bannerText !== undefined) updateData.bannerText = parsed.data.bannerText;

  const [updated] = await db.update(settingsTable)
    .set(updateData)
    .where(eq(settingsTable.id, settings.id))
    .returning();

  const result = updated ?? settings;

  res.json({
    bannerImageUrl: result.bannerImageUrl,
    siteName: result.siteName,
    bannerText: result.bannerText,
  });
});

export default router;
