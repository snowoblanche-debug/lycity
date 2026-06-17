import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  bannerImageUrl: text("banner_image_url"),
  siteName: text("site_name").notNull().default("LY.city"),
  siteSubtitle: text("site_subtitle"),
  bannerText: text("banner_text"),
  obsKey: text("obs_key"),
  testMode: boolean("test_mode").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
