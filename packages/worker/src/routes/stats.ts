import { Hono } from "hono";
import type { Env } from "../types";

const stats = new Hono<{ Bindings: Env }>();

stats.get("/", async (c) => {
  const db = c.env.DB;

  const [filesResult, versionsResult, trashResult, sharesResult] = await db.batch([
    db.prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(CASE WHEN is_dir = 0 THEN size ELSE 0 END), 0) as total_size, SUM(CASE WHEN is_dir = 1 THEN 1 ELSE 0 END) as dir_count FROM files WHERE deleted_at IS NULL"
    ),
    db.prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM file_versions"
    ),
    db.prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(CASE WHEN is_dir = 0 THEN size ELSE 0 END), 0) as total_size FROM files WHERE deleted_at IS NOT NULL"
    ),
    db.prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(download_count), 0) as total_downloads FROM shares"
    ),
  ]);

  const files = filesResult.results[0] as { count: number; total_size: number; dir_count: number };
  const versions = versionsResult.results[0] as { count: number; total_size: number };
  const trash = trashResult.results[0] as { count: number; total_size: number };
  const shares = sharesResult.results[0] as { count: number; total_downloads: number };

  const storageUsed = files.total_size + versions.total_size;
  const freeAllowance = 10 * 1024 * 1024 * 1024;
  const billableBytes = Math.max(0, storageUsed - freeAllowance);
  const monthlyCostUsd = billableBytes / (1024 * 1024 * 1024) * 0.015;

  return c.json({
    storage: {
      used: storageUsed,
      files_size: files.total_size,
      versions_size: versions.total_size,
      trash_size: trash.total_size,
      free_allowance: freeAllowance,
    },
    counts: {
      files: files.count - (files.dir_count ?? 0),
      folders: files.dir_count ?? 0,
      versions: versions.count,
      trash: trash.count,
      shares: shares.count,
      total_downloads: shares.total_downloads,
    },
    cost: {
      monthly_usd: Math.round(monthlyCostUsd * 100) / 100,
    },
  });
});

export { stats };
