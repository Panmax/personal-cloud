import { Hono } from "hono";
import type { Env } from "../types";
import { generateId } from "../utils/id";
import {
  listFiles,
  getFile,
  createFile,
  updateFile,
  softDeleteFile,
  createVersion,
  getNextVersion,
} from "../db/queries";

const files = new Hono<{ Bindings: Env }>();

// GET / — list directory
files.get("/", async (c) => {
  const parentId = c.req.query("parent_id") || null;
  const results = await listFiles(c.env.DB, parentId);
  return c.json({ files: results });
});

// GET /:id — file details
files.get("/:id", async (c) => {
  const file = await getFile(c.env.DB, c.req.param("id"));
  if (!file) return c.json({ error: "Not found" }, 404);
  return c.json(file);
});

// POST / — create folder or upload small file
files.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") || "";
  const now = new Date().toISOString();

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const parentId = formData.get("parent_id") as string | null;

    if (!file) return c.json({ error: "No file provided" }, 400);

    const id = generateId();
    const r2Key = `${id}/1`;

    await c.env.BUCKET.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    // Check for existing file with same name in same directory
    const existingFile = await c.env.DB.prepare(
      "SELECT id, r2_key, size FROM files WHERE name = ? AND parent_id IS ? AND deleted_at IS NULL AND is_dir = 0"
    )
      .bind(file.name, parentId)
      .first<{ id: string; r2_key: string; size: number }>();

    if (existingFile) {
      const nextVer = await getNextVersion(c.env.DB, existingFile.id);
      const versionId = generateId();
      await c.env.DB.batch([
        c.env.DB.prepare(
          "INSERT INTO file_versions (id, file_id, version, r2_key, size, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(versionId, existingFile.id, nextVer - 1, existingFile.r2_key, existingFile.size, now),
        c.env.DB.prepare(
          "UPDATE files SET r2_key = ?, size = ?, updated_at = ? WHERE id = ?"
        ).bind(r2Key, file.size, now, existingFile.id),
      ]);
      return c.json({ id: existingFile.id, versioned: true }, 200);
    }

    await createFile(c.env.DB, {
      id,
      name: file.name,
      parent_id: parentId || null,
      is_dir: 0,
      size: file.size,
      mime_type: file.type || "application/octet-stream",
      r2_key: r2Key,
      created_at: now,
      updated_at: now,
    });

    return c.json({ id }, 201);
  }

  // JSON body = create folder
  const body = await c.req.json<{ name: string; parent_id?: string }>();
  const id = generateId();
  await createFile(c.env.DB, {
    id,
    name: body.name,
    parent_id: body.parent_id || null,
    is_dir: 1,
    size: 0,
    mime_type: null,
    r2_key: null,
    created_at: now,
    updated_at: now,
  });
  return c.json({ id }, 201);
});

// PATCH /:id — rename or move
files.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; parent_id?: string }>();
  const now = new Date().toISOString();

  if (body.parent_id) {
    const target = await c.env.DB.prepare(
      "SELECT id, is_dir FROM files WHERE id = ? AND deleted_at IS NULL"
    ).bind(body.parent_id).first<{ id: string; is_dir: number }>();
    if (!target) return c.json({ error: "Target directory not found" }, 400);
    if (!target.is_dir) return c.json({ error: "Target is not a directory" }, 400);
  }

  const updates: Record<string, string | null> = { updated_at: now };
  if (body.name !== undefined) updates.name = body.name;
  if (body.parent_id !== undefined) updates.parent_id = body.parent_id || null;

  await updateFile(c.env.DB, id, updates);
  return c.json({ ok: true });
});

// DELETE /:id — soft delete
files.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const now = new Date().toISOString();
  await softDeleteFile(c.env.DB, id, now);
  return c.json({ ok: true });
});

// POST /batch — batch operations
files.post("/batch", async (c) => {
  const body = await c.req.json<{
    action: "delete" | "move";
    ids: string[];
    target?: string;
  }>();
  const now = new Date().toISOString();

  if (body.action === "delete") {
    for (const id of body.ids) {
      await softDeleteFile(c.env.DB, id, now);
    }
  } else if (body.action === "move" && body.target !== undefined) {
    if (body.target) {
      const target = await c.env.DB.prepare(
        "SELECT id, is_dir FROM files WHERE id = ? AND deleted_at IS NULL"
      ).bind(body.target).first<{ id: string; is_dir: number }>();
      if (!target) return c.json({ error: "Target directory not found" }, 400);
      if (!target.is_dir) return c.json({ error: "Target is not a directory" }, 400);
    }
    for (const id of body.ids) {
      await updateFile(c.env.DB, id, {
        parent_id: body.target || null,
        updated_at: now,
      });
    }
  }
  return c.json({ ok: true });
});

// GET /:id/download — download file
files.get("/:id/download", async (c) => {
  const file = await getFile(c.env.DB, c.req.param("id"));
  if (!file || !file.r2_key) return c.json({ error: "Not found" }, 404);

  const object = await c.env.BUCKET.get(file.r2_key);
  if (!object) return c.json({ error: "Object not found" }, 404);

  const headers = new Headers();
  headers.set("Content-Type", file.mime_type || "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(file.name)}"`
  );
  headers.set("Content-Length", String(file.size));

  return new Response(object.body, { headers });
});

export { files };
