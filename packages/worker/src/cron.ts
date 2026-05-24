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
    `SELECT fv.id, fv.r2_key, fv.file_id FROM file_versions fv
     WHERE fv.created_at < ?
     AND fv.version NOT IN (
       SELECT fv2.version FROM file_versions fv2
       WHERE fv2.file_id = fv.file_id
       ORDER BY fv2.version DESC LIMIT 10
     )`
  )
    .bind(ninetyDaysAgo)
    .all<{ id: string; r2_key: string; file_id: string }>();

  for (const ver of oldVersions.results) {
    const activeFile = await env.DB.prepare(
      "SELECT id FROM files WHERE id = ? AND r2_key = ?"
    ).bind(ver.file_id, ver.r2_key).first<{ id: string }>();
    if (!activeFile) {
      await env.BUCKET.delete(ver.r2_key);
    }
    await env.DB.prepare("DELETE FROM file_versions WHERE id = ?").bind(ver.id).run();
  }

  // 3. Purge expired share links
  await env.DB.prepare("DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at < ?")
    .bind(now.toISOString())
    .run();

  // 4. Clean up orphaned files (parent_id points to a non-existent record)
  // Only soft-delete orphans (give user a chance to recover), do NOT permanently delete
  // Also skip files that are already soft-deleted (they go through normal trash flow)
  const orphans = await env.DB.prepare(
    `SELECT id FROM files
     WHERE parent_id IS NOT NULL
     AND deleted_at IS NULL
     AND parent_id NOT IN (SELECT id FROM files)`
  ).all<{ id: string }>();

  for (const orphan of orphans.results) {
    await env.DB.prepare(
      "UPDATE files SET deleted_at = ?, updated_at = ? WHERE id = ?"
    ).bind(now.toISOString(), now.toISOString(), orphan.id).run();
  }
}
