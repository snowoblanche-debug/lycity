import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const songsTable = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  language: text("language").notNull().default("日語"),
  playCount: integer("play_count").notNull().default(0),
  primaryTag: text("primary_tag"),
  categories: jsonb("categories").$type<string[]>().notNull().default([]),
  youtubeUrl: text("youtube_url"),
  status: text("status").notNull().default("已解鎖"),
  isPracticing: boolean("is_practicing").notNull().default(false),
  hasPitchWarning: boolean("has_pitch_warning").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSongSchema = createInsertSchema(songsTable).omit({ id: true, createdAt: true });
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songsTable.$inferSelect;
