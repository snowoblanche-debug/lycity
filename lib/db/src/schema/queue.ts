import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { songsTable } from "./songs";
import { songSessionsTable } from "./song-sessions";

export const queueTable = pgTable("queue", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").notNull().references(() => songsTable.id, { onDelete: "cascade" }),
  requesterName: text("requester_name").notNull(),
  note: text("note"),
  position: integer("position").notNull().default(0),
  status: text("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  // V3 State machine timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  // V3 Session tracking
  sessionId: integer("session_id").references(() => songSessionsTable.id, { onDelete: "set null" }),
});

export const insertQueueSchema = createInsertSchema(queueTable).omit({ id: true, createdAt: true });
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type QueueEntry = typeof queueTable.$inferSelect;
