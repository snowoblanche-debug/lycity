import { Router, type IRouter } from "express";
import { signJWT, verifyJWT, requireAdmin } from "../middleware/auth";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/admin/login", (req, res): void => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!adminPassword) {
    res.status(503).json({ error: "Admin not configured. Set ADMIN_PASSWORD environment variable." });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "密碼錯誤" });
    return;
  }

  const token = signJWT({ role: "admin" });
  res.json({ token });
});

router.get("/admin/me", (req, res): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ isAdmin: false });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload || payload["role"] !== "admin") {
    res.status(401).json({ isAdmin: false });
    return;
  }
  res.json({ isAdmin: true });
});

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length === 0) {
    res.json({ obsKey: null });
    return;
  }
  res.json({ obsKey: rows[0].obsKey ?? null });
});

export default router;
