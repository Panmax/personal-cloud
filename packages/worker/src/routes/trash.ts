import { Hono } from "hono";
import type { Env } from "../types";
import { listTrash, restoreFile, permanentDeleteFile } from "../db/queries";

const trash = new Hono<{ Bindings: Env }>();

trash.get("/", async (c) => {
  const items = await listTrash(c.env.DB);
  return c.json({ files: items });
});

trash.post("/:id/restore", async (c) => {
  const id = c.req.param("id");
  const now = new Date().toISOString();
  await restoreFile(c.env.DB, id, now);
  return c.json({ ok: true });
});

trash.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const { r2Keys } = await permanentDeleteFile(c.env.DB, id);
  for (const key of r2Keys) {
    await c.env.BUCKET.delete(key);
  }
  return c.json({ ok: true });
});

trash.delete("/", async (c) => {
  const items = await listTrash(c.env.DB);
  for (const item of items) {
    const { r2Keys } = await permanentDeleteFile(c.env.DB, item.id);
    for (const key of r2Keys) {
      await c.env.BUCKET.delete(key);
    }
  }
  return c.json({ ok: true });
});

export { trash };
