import { Hono } from "hono";
import type { Env } from "../types";
import { signJwt } from "../utils/jwt";

const auth = new Hono<{ Bindings: Env }>();

auth.post("/login", async (c) => {
  const body = await c.req.json<{ password: string }>();
  const storedHash = c.env.AUTH_PASSWORD_HASH;

  if (!storedHash) {
    return c.json({ error: "Password not configured" }, 500);
  }

  // Hash the provided password with SHA-256 and compare to stored hash
  const encoder = new TextEncoder();
  const data = encoder.encode(body.password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hashHex !== storedHash) {
    return c.json({ error: "Invalid password" }, 401);
  }

  const token = await signJwt(c.env.JWT_SECRET);
  return c.json({ token });
});

export { auth };
