import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const songSessionsTable = pgTable("song_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(false),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSongSessionSchema = createInsertSchema(songSessionsTable).omit({ id: true, createdAt: true });
export type InsertSongSession = z.infer<typeof insertSongSessionSchema>;
export type SongSession = typeof songSessionsTable.$inferSelect;
