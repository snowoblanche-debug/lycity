import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

const VALID_TYPES = ["language", "theme", "season", "custom"] as const;
type CategoryType = typeof VALID_TYPES[number];

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.type, categoriesTable.name);
  res.json({ categories });
});

router.post("/categories", requireAdmin, async (req, res): Promise<void> => {
  const { name, type } = req.body as { name?: string; type?: string };
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" }); return;
  }
  if (!VALID_TYPES.includes(type as CategoryType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }); return;
  }

  const [category] = await db.insert(categoriesTable).values({
    name: name.trim(),
    type: type as CategoryType,
  }).returning();

  res.status(201).json(category);
});

router.patch("/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, type } = req.body as { name?: string; type?: string };
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (type !== undefined) {
    if (!VALID_TYPES.includes(type as CategoryType)) {
      res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }); return;
    }
    updateData.type = type;
  }

  const [category] = await db.update(categoriesTable).set(updateData).where(eq(categoriesTable.id, id)).returning();
  if (!category) { res.status(404).json({ error: "Category not found" }); return; }

  res.json(category);
});

router.delete("/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [category] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
  if (!category) { res.status(404).json({ error: "Category not found" }); return; }

  res.sendStatus(204);
});

export default router;
