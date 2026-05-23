import type { FileRecord } from "../types";

export async function resolvePathToFile(
  db: D1Database,
  segments: string[]
): Promise<FileRecord | null> {
  if (segments.length === 0) return null;

  let parentId: string | null = null;
  let file: FileRecord | null = null;

  for (const name of segments) {
    const sql = parentId
      ? "SELECT * FROM files WHERE name = ? AND parent_id = ? AND deleted_at IS NULL"
      : "SELECT * FROM files WHERE name = ? AND parent_id IS NULL AND deleted_at IS NULL";
    const params = parentId ? [name, parentId] : [name];
    file = await db.prepare(sql).bind(...params).first<FileRecord>();
    if (!file) return null;
    parentId = file.id;
  }

  return file;
}

export async function listChildrenByParentId(
  db: D1Database,
  parentId: string | null
): Promise<FileRecord[]> {
  const sql = parentId
    ? "SELECT * FROM files WHERE parent_id = ? AND deleted_at IS NULL ORDER BY is_dir DESC, name ASC"
    : "SELECT * FROM files WHERE parent_id IS NULL AND deleted_at IS NULL ORDER BY is_dir DESC, name ASC";
  const params = parentId ? [parentId] : [];
  const result = await db.prepare(sql).bind(...params).all<FileRecord>();
  return result.results;
}
