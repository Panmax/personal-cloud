import { Hono } from "hono";
import type { Env } from "../types";
import { generateId } from "../utils/id";
import { getFile, listVersions, updateFile, createVersion, getNextVersion } from "../db/queries";

const versions = new Hono<{ Bindings: Env }>();

versions.get("/:id/versions", async (c) => {
  const fileId = c.req.param("id");
  const versionList = await listVersions(c.env.DB, fileId);
  return c.json({ versions: versionList });
});

versions.post("/:id/revert", async (c) => {
  const fileId = c.req.param("id");
  const body = await c.req.json<{ version_id: string }>();
  const now = new Date().toISOString();

  const file = await getFile(c.env.DB, fileId);
  if (!file) return c.json({ error: "Not found" }, 404);

  const targetVersion = await c.env.DB.prepare(
    "SELECT * FROM file_versions WHERE id = ? AND file_id = ?"
  ).bind(body.version_id, fileId).first<{ r2_key: string; size: number }>();

  if (!targetVersion) return c.json({ error: "Version not found" }, 404);

  const nextVer = await getNextVersion(c.env.DB, fileId);
  await createVersion(c.env.DB, {
    id: generateId(),
    file_id: fileId,
    version: nextVer,
    r2_key: file.r2_key!,
    size: file.size,
    created_at: now,
  });

  await updateFile(c.env.DB, fileId, {
    r2_key: targetVersion.r2_key,
    size: targetVersion.size,
    updated_at: now,
  });

  return c.json({ ok: true });
});

versions.delete("/:id/versions/:vid", async (c) => {
  const fileId = c.req.param("id");
  const versionId = c.req.param("vid");

  const version = await c.env.DB.prepare(
    "SELECT r2_key FROM file_versions WHERE id = ? AND file_id = ?"
  ).bind(versionId, fileId).first<{ r2_key: string }>();

  if (!version) return c.json({ error: "Version not found" }, 404);

  const file = await getFile(c.env.DB, fileId);
  const keyInUse = file?.r2_key === version.r2_key;

  if (!keyInUse) {
    const otherRef = await c.env.DB.prepare(
      "SELECT id FROM file_versions WHERE r2_key = ? AND id != ?"
    ).bind(version.r2_key, versionId).first<{ id: string }>();
    if (!otherRef) {
      await c.env.BUCKET.delete(version.r2_key);
    }
  }

  await c.env.DB.prepare("DELETE FROM file_versions WHERE id = ?").bind(versionId).run();

  return c.json({ ok: true });
});

export { versions };
