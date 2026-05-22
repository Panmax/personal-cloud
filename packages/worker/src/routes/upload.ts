import { Hono } from "hono";
import type { Env } from "../types";
import { generateId } from "../utils/id";
import {
  createFile,
  updateFile,
  createVersion,
  getNextVersion,
} from "../db/queries";

const upload = new Hono<{ Bindings: Env }>();

// POST /presign — initiate multipart upload, return upload_id
upload.post("/presign", async (c) => {
  const body = await c.req.json<{
    filename: string;
    size: number;
    mime_type: string;
    parts_count: number;
    parent_id?: string;
  }>();

  const fileId = generateId();
  const r2Key = `${fileId}/1`;

  const multipartUpload = await c.env.BUCKET.createMultipartUpload(r2Key, {
    httpMetadata: { contentType: body.mime_type },
  });

  return c.json({
    file_id: fileId,
    r2_key: r2Key,
    upload_id: multipartUpload.uploadId,
    parts_count: body.parts_count,
    filename: body.filename,
    size: body.size,
    mime_type: body.mime_type,
    parent_id: body.parent_id || null,
  });
});

// PUT /part — upload a single part (client sends raw bytes)
upload.put("/part", async (c) => {
  const key = c.req.query("key");
  const uploadId = c.req.query("uploadId");
  const partNumber = parseInt(c.req.query("partNumber") || "0");

  if (!key || !uploadId || !partNumber) {
    return c.json({ error: "Missing parameters" }, 400);
  }

  const multipartUpload = c.env.BUCKET.resumeMultipartUpload(key, uploadId);
  const blob = await c.req.arrayBuffer();
  const part = await multipartUpload.uploadPart(partNumber, blob);

  return new Response(null, {
    status: 200,
    headers: { etag: part.etag },
  });
});

// POST /complete — finalize multipart upload, write metadata to D1
upload.post("/complete", async (c) => {
  const body = await c.req.json<{
    file_id: string;
    r2_key: string;
    upload_id: string;
    filename: string;
    size: number;
    mime_type: string;
    parent_id: string | null;
    parts: { partNumber: number; etag: string }[];
  }>();

  const now = new Date().toISOString();

  const multipartUpload = c.env.BUCKET.resumeMultipartUpload(
    body.r2_key,
    body.upload_id
  );

  await multipartUpload.complete(
    body.parts.map((p) => ({
      partNumber: p.partNumber,
      etag: p.etag,
    }))
  );

  // Check for existing file with same name (version handling)
  const existingFile = await c.env.DB.prepare(
    "SELECT id, r2_key, size FROM files WHERE name = ? AND parent_id IS ? AND deleted_at IS NULL AND is_dir = 0"
  )
    .bind(body.filename, body.parent_id)
    .first<{ id: string; r2_key: string; size: number }>();

  if (existingFile) {
    const nextVer = await getNextVersion(c.env.DB, existingFile.id);
    await createVersion(c.env.DB, {
      id: generateId(),
      file_id: existingFile.id,
      version: nextVer - 1,
      r2_key: existingFile.r2_key,
      size: existingFile.size,
      created_at: now,
    });
    await updateFile(c.env.DB, existingFile.id, {
      r2_key: body.r2_key,
      size: body.size,
      updated_at: now,
    });
    return c.json({ id: existingFile.id, versioned: true });
  }

  await createFile(c.env.DB, {
    id: body.file_id,
    name: body.filename,
    parent_id: body.parent_id,
    is_dir: 0,
    size: body.size,
    mime_type: body.mime_type,
    r2_key: body.r2_key,
    created_at: now,
    updated_at: now,
  });

  return c.json({ id: body.file_id });
});

export { upload };
