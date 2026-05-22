import { Hono } from "hono";
import type { Env } from "../types";
import { generateShareId } from "../utils/id";
import { createShare, listShares, deleteShare, getFile } from "../db/queries";
import type { ShareRecord } from "../types";

const shares = new Hono<{ Bindings: Env }>();

shares.post("/", async (c) => {
  const body = await c.req.json<{
    file_id: string;
    password?: string;
    expires_in?: "1d" | "7d" | "30d" | null;
  }>();

  const file = await getFile(c.env.DB, body.file_id);
  if (!file) return c.json({ error: "File not found" }, 404);

  const now = new Date();
  let expiresAt: string | null = null;
  if (body.expires_in) {
    const days = parseInt(body.expires_in);
    const expiry = new Date(now.getTime() + days * 86400000);
    expiresAt = expiry.toISOString();
  }

  let passwordHash: string | null = null;
  if (body.password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(body.password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    passwordHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  const id = generateShareId();
  const share: ShareRecord = {
    id,
    file_id: body.file_id,
    password: passwordHash,
    expires_at: expiresAt,
    download_count: 0,
    created_at: now.toISOString(),
  };

  await createShare(c.env.DB, share);
  return c.json({ id, url: `/s/${id}` }, 201);
});

shares.get("/", async (c) => {
  const allShares = await listShares(c.env.DB);
  return c.json({ shares: allShares });
});

shares.delete("/:id", async (c) => {
  await deleteShare(c.env.DB, c.req.param("id"));
  return c.json({ ok: true });
});

export { shares };
