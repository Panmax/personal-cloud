import { Hono } from "hono";
import type { Env } from "../types";
import { getShare, getFile, incrementDownloadCount } from "../db/queries";

const publicRoutes = new Hono<{ Bindings: Env }>();

publicRoutes.get("/:id", async (c) => {
  const share = await getShare(c.env.DB, c.req.param("id"));
  if (!share) return c.json({ error: "Share not found" }, 404);

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return c.json({ error: "Share expired" }, 410);
  }

  const file = await getFile(c.env.DB, share.file_id);
  if (!file) return c.json({ error: "File not found" }, 404);

  return c.json({
    filename: file.name,
    size: file.size,
    mime_type: file.mime_type,
    has_password: !!share.password,
    download_count: share.download_count,
  });
});

publicRoutes.post("/:id/download", async (c) => {
  const share = await getShare(c.env.DB, c.req.param("id"));
  if (!share) return c.json({ error: "Share not found" }, 404);

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return c.json({ error: "Share expired" }, 410);
  }

  if (share.password) {
    const body = await c.req.json<{ password?: string }>().catch(() => ({}));
    if (!body.password) return c.json({ error: "Password required" }, 401);
    const encoder = new TextEncoder();
    const data = encoder.encode(body.password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hashHex !== share.password) {
      return c.json({ error: "Invalid password" }, 401);
    }
  }

  const file = await getFile(c.env.DB, share.file_id);
  if (!file || !file.r2_key) return c.json({ error: "File not found" }, 404);

  await incrementDownloadCount(c.env.DB, share.id);

  const object = await c.env.BUCKET.get(file.r2_key);
  if (!object) return c.json({ error: "Object not found" }, 404);

  const headers = new Headers();
  headers.set("Content-Type", file.mime_type || "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);

  return new Response(object.body, { headers });
});

export { publicRoutes };
