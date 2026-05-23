import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

export const basicAuthMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header || !header.startsWith("Basic ")) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Personal Cloud"' },
      });
    }

    const decoded = atob(header.slice(6));
    const password = decoded.includes(":")
      ? decoded.split(":").slice(1).join(":")
      : decoded;

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(password));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hashHex !== c.env.AUTH_PASSWORD_HASH) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Personal Cloud"' },
      });
    }

    await next();
  }
);
