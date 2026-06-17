import { createHmac, timingSafeEqual } from "crypto";
import { type Request, type Response, type NextFunction } from "express";

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "dev-fallback-secret-change-in-prod";

export function signJWT(payload: Record<string, unknown>, expiresInSecs = 86400 * 30): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + expiresInSecs;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const sig = createHmac("sha256", SESSION_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = createHmac("sha256", SESSION_SECRET).update(`${header}.${body}`).digest("base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Record<string, unknown>;
    if (typeof p["exp"] === "number" && p["exp"] < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload || payload["role"] !== "admin") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
