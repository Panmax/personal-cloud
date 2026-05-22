import type { Env } from "./types";

export async function handleCron(env: Env): Promise<void> {
  const now = new Date();

  // 1. Purge trash items older than 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const oldTrash = await env.DB.prepare(
    "SELECT id, r2_key FROM files WHERE deleted_at IS NOT NULL AND deleted_at < ?"
  )
    .bind(thirtyDaysAgo)
    .all<{ id: string; r2_key: string | null }>();

  for (const item of oldTrash.results) {
    const versions = await env.DB.prepare(
      "SELECT r2_key FROM file_versions WHERE file_id = ?"
    )
      .bind(item.id)
      .all<{ r2_key: string }>();

    const keysToDelete = versions.results.map((v) => v.r2_key);
    if (item.r2_key) keysToDelete.push(item.r2_key);

    for (const key of keysToDelete) {
      await env.BUCKET.delete(key);
    }

    await env.DB.prepare("DELETE FROM file_versions WHERE file_id = ?").bind(item.id).run();
    await env.DB.prepare("DELETE FROM shares WHERE file_id = ?").bind(item.id).run();
    await env.DB.prepare("DELETE FROM files WHERE id = ?").bind(item.id).run();
  }

  // 2. Purge old versions (keep latest 10 per file, delete those older than 90 days)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();
  const oldVersions = await env.DB.prepare(
    `SELECT fv.id, fv.r2_key, fv.file_id, fv.version FROM file_versions fv
     WHERE fv.created_at < ?
     AND fv.version NOT IN (
       SELECT fv2.version FROM file_versions fv2
       WHERE fv2.file_id = fv.file_id
       ORDER BY fv2.version DESC LIMIT 10
     )`
  )
    .bind(ninetyDaysAgo)
    .all<{ id: string; r2_key: string }>();

  for (const ver of oldVersions.results) {
    await env.BUCKET.delete(ver.r2_key);
    await env.DB.prepare("DELETE FROM file_versions WHERE id = ?").bind(ver.id).run();
  }

  // 3. Purge expired share links
  await env.DB.prepare("DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at < ?")
    .bind(now.toISOString())
    .run();

  // 4. Clean up orphaned files (parent_id points to a non-existent record)
  const orphans = await env.DB.prepare(
    `SELECT id, r2_key FROM files
     WHERE parent_id IS NOT NULL
     AND parent_id NOT IN (SELECT id FROM files)`
  ).all<{ id: string; r2_key: string | null }>();

  for (const orphan of orphans.results) {
    const versions = await env.DB.prepare(
      "SELECT r2_key FROM file_versions WHERE file_id = ?"
    ).bind(orphan.id).all<{ r2_key: string }>();

    const keysToDelete = versions.results.map((v) => v.r2_key);
    if (orphan.r2_key) keysToDelete.push(orphan.r2_key);

    for (const key of keysToDelete) {
      await env.BUCKET.delete(key);
    }

    await env.DB.prepare("DELETE FROM file_versions WHERE file_id = ?").bind(orphan.id).run();
    await env.DB.prepare("DELETE FROM shares WHERE file_id = ?").bind(orphan.id).run();
    await env.DB.prepare("DELETE FROM files WHERE id = ?").bind(orphan.id).run();
  }
}
