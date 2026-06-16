import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { songsTable } from "./songs";

export const songHistoryTable = pgTable("song_history", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songsTable.id, { onDelete: "set null" }),
  songTitle: text("song_title").notNull(),
  artist: text("artist").notNull(),
  requester: text("requester").notNull(),
  language: text("language").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  vodUrl: text("vod_url"),
  timestampText: text("timestamp_text"),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
});

export const insertSongHistorySchema = createInsertSchema(songHistoryTable).omit({ id: true });
export type InsertSongHistory = z.infer<typeof insertSongHistorySchema>;
export type SongHistory = typeof songHistoryTable.$inferSelect;
