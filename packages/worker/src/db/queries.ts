import type { FileRecord, FileVersionRecord, ShareRecord } from "../types";

export async function listFiles(
  db: D1Database,
  parentId: string | null
): Promise<FileRecord[]> {
  if (parentId === null) {
    const result = await db
      .prepare(
        "SELECT * FROM files WHERE parent_id IS NULL AND deleted_at IS NULL ORDER BY is_dir DESC, name ASC"
      )
      .all<FileRecord>();
    return result.results;
  } else {
    const result = await db
      .prepare(
        "SELECT * FROM files WHERE parent_id = ? AND deleted_at IS NULL ORDER BY is_dir DESC, name ASC"
      )
      .bind(parentId)
      .all<FileRecord>();
    return result.results;
  }
}

export async function getFile(
  db: D1Database,
  id: string
): Promise<FileRecord | null> {
  return db
    .prepare("SELECT * FROM files WHERE id = ?")
    .bind(id)
    .first<FileRecord>();
}

export async function createFile(
  db: D1Database,
  file: Omit<FileRecord, "deleted_at">
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO files (id, name, parent_id, is_dir, size, mime_type, r2_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      file.id,
      file.name,
      file.parent_id,
      file.is_dir,
      file.size,
      file.mime_type,
      file.r2_key,
      file.created_at,
      file.updated_at
    )
    .run();
}

export async function updateFile(
  db: D1Database,
  id: string,
  updates: Partial<Omit<FileRecord, "id" | "created_at">>
): Promise<void> {
  const keys = Object.keys(updates) as (keyof typeof updates)[];
  if (keys.length === 0) return;

  const setClauses = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => updates[k]);

  await db
    .prepare(`UPDATE files SET ${setClauses} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function softDeleteFile(
  db: D1Database,
  id: string,
  now: string
): Promise<void> {
  await db
    .prepare("UPDATE files SET deleted_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, id)
    .run();

  const children = await db
    .prepare("SELECT id FROM files WHERE parent_id = ? AND deleted_at IS NULL")
    .bind(id)
    .all<{ id: string }>();

  for (const child of children.results) {
    await softDeleteFile(db, child.id, now);
  }
}

export async function listTrash(db: D1Database): Promise<FileRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM files WHERE deleted_at IS NOT NULL
       AND (parent_id IS NULL OR parent_id NOT IN (SELECT id FROM files WHERE deleted_at IS NOT NULL))
       ORDER BY deleted_at DESC`
    )
    .all<FileRecord>();
  return result.results;
}

export async function restoreFile(
  db: D1Database,
  id: string,
  now: string
): Promise<void> {
  const file = await getFile(db, id);
  if (!file) return;

  let parentId = file.parent_id;
  if (parentId !== null) {
    const parent = await db
      .prepare("SELECT id FROM files WHERE id = ? AND deleted_at IS NULL")
      .bind(parentId)
      .first<{ id: string }>();
    if (!parent) {
      parentId = null;
    }
  }

  await db
    .prepare("UPDATE files SET deleted_at = NULL, parent_id = ?, updated_at = ? WHERE id = ?")
    .bind(parentId, now, id)
    .run();

  const children = await db
    .prepare("SELECT id FROM files WHERE parent_id = ? AND deleted_at IS NOT NULL")
    .bind(id)
    .all<{ id: string }>();

  for (const child of children.results) {
    await db
      .prepare("UPDATE files SET deleted_at = NULL, updated_at = ? WHERE id = ?")
      .bind(now, child.id)
      .run();
    const grandchildren = await db
      .prepare("SELECT id FROM files WHERE parent_id = ? AND deleted_at IS NOT NULL")
      .bind(child.id)
      .all<{ id: string }>();
    for (const gc of grandchildren.results) {
      await restoreFile(db, gc.id, now);
    }
  }
}

export async function permanentDeleteFile(
  db: D1Database,
  id: string
): Promise<{ r2Keys: string[] }> {
  const r2Keys: string[] = [];

  const children = await db
    .prepare("SELECT id FROM files WHERE parent_id = ?")
    .bind(id)
    .all<{ id: string }>();

  for (const child of children.results) {
    const childResult = await permanentDeleteFile(db, child.id);
    r2Keys.push(...childResult.r2Keys);
  }

  const file = await db
    .prepare("SELECT r2_key FROM files WHERE id = ?")
    .bind(id)
    .first<{ r2_key: string | null }>();

  const versions = await db
    .prepare("SELECT r2_key FROM file_versions WHERE file_id = ?")
    .bind(id)
    .all<{ r2_key: string }>();

  if (file?.r2_key) r2Keys.push(file.r2_key);
  for (const v of versions.results) {
    r2Keys.push(v.r2_key);
  }

  await db
    .prepare("DELETE FROM file_versions WHERE file_id = ?")
    .bind(id)
    .run();
  await db
    .prepare("DELETE FROM shares WHERE file_id = ?")
    .bind(id)
    .run();
  await db
    .prepare("DELETE FROM files WHERE id = ?")
    .bind(id)
    .run();

  return { r2Keys };
}

export async function searchFiles(
  db: D1Database,
  query: string
): Promise<FileRecord[]> {
  const result = await db
    .prepare(
      "SELECT * FROM files WHERE name LIKE ? AND deleted_at IS NULL ORDER BY is_dir DESC, name ASC LIMIT 50"
    )
    .bind(`%${query}%`)
    .all<FileRecord>();
  return result.results;
}

export async function listVersions(
  db: D1Database,
  fileId: string
): Promise<FileVersionRecord[]> {
  const result = await db
    .prepare(
      "SELECT * FROM file_versions WHERE file_id = ? ORDER BY version DESC"
    )
    .bind(fileId)
    .all<FileVersionRecord>();
  return result.results;
}

export async function createVersion(
  db: D1Database,
  version: FileVersionRecord
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO file_versions (id, file_id, version, r2_key, size, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(
      version.id,
      version.file_id,
      version.version,
      version.r2_key,
      version.size,
      version.created_at
    )
    .run();
}

export async function getNextVersion(
  db: D1Database,
  fileId: string
): Promise<number> {
  const result = await db
    .prepare(
      "SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM file_versions WHERE file_id = ?"
    )
    .bind(fileId)
    .first<{ next_version: number }>();
  return result?.next_version ?? 1;
}

export async function createShare(
  db: D1Database,
  share: ShareRecord
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO shares (id, file_id, password, expires_at, download_count, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(
      share.id,
      share.file_id,
      share.password,
      share.expires_at,
      share.download_count,
      share.created_at
    )
    .run();
}

export async function getShare(
  db: D1Database,
  id: string
): Promise<ShareRecord | null> {
  return db
    .prepare("SELECT * FROM shares WHERE id = ?")
    .bind(id)
    .first<ShareRecord>();
}

export async function listShares(db: D1Database): Promise<(ShareRecord & { file_name: string | null })[]> {
  const result = await db
    .prepare("SELECT shares.*, files.name as file_name FROM shares LEFT JOIN files ON shares.file_id = files.id ORDER BY shares.created_at DESC")
    .all<ShareRecord & { file_name: string | null }>();
  return result.results;
}

export async function deleteShare(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM shares WHERE id = ?").bind(id).run();
}

export async function incrementDownloadCount(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare("UPDATE shares SET download_count = download_count + 1 WHERE id = ?")
    .bind(id)
    .run();
}
