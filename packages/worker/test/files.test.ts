import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import {
  createFile,
  getFile,
  listFiles,
  softDeleteFile,
  listTrash,
  restoreFile,
  searchFiles,
} from "../src/db/queries";

describe("file queries", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM file_versions");
    await env.DB.exec("DELETE FROM shares");
    await env.DB.exec("DELETE FROM files");
  });

  it("creates and retrieves a file", async () => {
    const now = new Date().toISOString();
    await createFile(env.DB, {
      id: "file1",
      name: "test.txt",
      parent_id: null,
      is_dir: 0,
      size: 1024,
      mime_type: "text/plain",
      r2_key: "file1/1",
      created_at: now,
      updated_at: now,
    });
    const file = await getFile(env.DB, "file1");
    expect(file).not.toBeNull();
    expect(file!.name).toBe("test.txt");
    expect(file!.size).toBe(1024);
  });

  it("lists files in root directory", async () => {
    const now = new Date().toISOString();
    await createFile(env.DB, {
      id: "dir1",
      name: "Documents",
      parent_id: null,
      is_dir: 1,
      size: 0,
      mime_type: null,
      r2_key: null,
      created_at: now,
      updated_at: now,
    });
    await createFile(env.DB, {
      id: "file1",
      name: "readme.md",
      parent_id: null,
      is_dir: 0,
      size: 512,
      mime_type: "text/markdown",
      r2_key: "file1/1",
      created_at: now,
      updated_at: now,
    });
    const files = await listFiles(env.DB, null);
    expect(files).toHaveLength(2);
    expect(files[0].name).toBe("Documents");
    expect(files[1].name).toBe("readme.md");
  });

  it("soft deletes and restores", async () => {
    const now = new Date().toISOString();
    await createFile(env.DB, {
      id: "file1",
      name: "test.txt",
      parent_id: null,
      is_dir: 0,
      size: 100,
      mime_type: "text/plain",
      r2_key: "file1/1",
      created_at: now,
      updated_at: now,
    });
    await softDeleteFile(env.DB, "file1", now);
    const active = await listFiles(env.DB, null);
    expect(active).toHaveLength(0);
    const trash = await listTrash(env.DB);
    expect(trash).toHaveLength(1);
    await restoreFile(env.DB, "file1", now);
    const restored = await listFiles(env.DB, null);
    expect(restored).toHaveLength(1);
  });

  it("searches files by name", async () => {
    const now = new Date().toISOString();
    await createFile(env.DB, {
      id: "f1",
      name: "vacation-photo.jpg",
      parent_id: null,
      is_dir: 0,
      size: 5000,
      mime_type: "image/jpeg",
      r2_key: "f1/1",
      created_at: now,
      updated_at: now,
    });
    await createFile(env.DB, {
      id: "f2",
      name: "report.pdf",
      parent_id: null,
      is_dir: 0,
      size: 3000,
      mime_type: "application/pdf",
      r2_key: "f2/1",
      created_at: now,
      updated_at: now,
    });
    const results = await searchFiles(env.DB, "photo");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("vacation-photo.jpg");
  });
});
