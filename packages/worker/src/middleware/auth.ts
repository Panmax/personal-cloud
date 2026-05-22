import { createMiddleware } from "hono/factory";
import type { Env } from "../types";
import { verifyJwt } from "../utils/jwt";

export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const token = header.slice(7);
    const result = await verifyJwt(token, c.env.JWT_SECRET);
    if (!result.valid) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  }
);
