import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const requesterStatsTable = pgTable("requester_stats", {
  id: serial("id").primaryKey(),
  requesterName: text("requester_name").notNull().unique(),
  requestCount: integer("request_count").notNull().default(0),
  lastRequestAt: timestamp("last_request_at").notNull().defaultNow(),
});

export const insertRequesterStatsSchema = createInsertSchema(requesterStatsTable).omit({ id: true });
export type InsertRequesterStats = z.infer<typeof insertRequesterStatsSchema>;
export type RequesterStats = typeof requesterStatsTable.$inferSelect;
