import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { SELF, env } from "cloudflare:test";
import { getAuthToken, authHeaders } from "./helpers";

describe("trash integration", () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  beforeEach(async () => {
    await env.DB.exec("DELETE FROM file_versions");
    await env.DB.exec("DELETE FROM shares");
    await env.DB.exec("DELETE FROM files");
  });

  async function createAndDeleteFile(name: string): Promise<string> {
    const createRes = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name }),
    });
    const { id } = (await createRes.json()) as { id: string };
    await SELF.fetch(`http://localhost/api/files/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    return id;
  }

  it("GET /api/trash lists trashed files", async () => {
    await createAndDeleteFile("TrashedFile.txt");

    const res = await SELF.fetch("http://localhost/api/trash", {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { files: { name: string }[] };
    expect(data.files).toHaveLength(1);
    expect(data.files[0].name).toBe("TrashedFile.txt");
  });

  it("POST /api/trash/:id/restore restores file to active list", async () => {
    const id = await createAndDeleteFile("RestoreMe.txt");

    // Restore
    const restoreRes = await SELF.fetch(
      `http://localhost/api/trash/${id}/restore`,
      {
        method: "POST",
        headers: authHeaders(token),
      }
    );
    expect(restoreRes.status).toBe(200);
    const restoreData = (await restoreRes.json()) as { ok: boolean };
    expect(restoreData.ok).toBe(true);

    // Confirm in active files
    const filesRes = await SELF.fetch("http://localhost/api/files", {
      headers: authHeaders(token),
    });
    const filesData = (await filesRes.json()) as { files: { name: string }[] };
    expect(filesData.files).toHaveLength(1);
    expect(filesData.files[0].name).toBe("RestoreMe.txt");

    // Confirm not in trash
    const trashRes = await SELF.fetch("http://localhost/api/trash", {
      headers: authHeaders(token),
    });
    const trashData = (await trashRes.json()) as { files: unknown[] };
    expect(trashData.files).toHaveLength(0);
  });

  it("DELETE /api/trash/:id permanently deletes file", async () => {
    // Upload actual file so R2 key exists
    const formData = new FormData();
    const blob = new Blob(["permanent delete test"], { type: "text/plain" });
    formData.append("file", blob, "perm-delete.txt");

    const uploadRes = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const { id } = (await uploadRes.json()) as { id: string };

    // Soft delete it
    await SELF.fetch(`http://localhost/api/files/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });

    // Permanently delete from trash
    const permDeleteRes = await SELF.fetch(`http://localhost/api/trash/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    expect(permDeleteRes.status).toBe(200);
    const permDeleteData = (await permDeleteRes.json()) as { ok: boolean };
    expect(permDeleteData.ok).toBe(true);

    // Confirm not in trash
    const trashRes = await SELF.fetch("http://localhost/api/trash", {
      headers: authHeaders(token),
    });
    const trashData = (await trashRes.json()) as { files: unknown[] };
    expect(trashData.files).toHaveLength(0);

    // Confirm not in DB
    const row = await env.DB.prepare("SELECT id FROM files WHERE id = ?")
      .bind(id)
      .first();
    expect(row).toBeNull();
  });
});
