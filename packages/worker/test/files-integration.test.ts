import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { SELF, env } from "cloudflare:test";
import { getAuthToken, authHeaders } from "./helpers";

describe("files integration", () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  beforeEach(async () => {
    await env.DB.exec("DELETE FROM file_versions");
    await env.DB.exec("DELETE FROM shares");
    await env.DB.exec("DELETE FROM files");
  });

  it("GET /api/files returns 200 with empty files array", async () => {
    const res = await SELF.fetch("http://localhost/api/files", {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { files: unknown[] };
    expect(Array.isArray(data.files)).toBe(true);
    expect(data.files).toHaveLength(0);
  });

  it("POST /api/files with JSON body creates folder, returns 201 + id", async () => {
    const res = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "My Folder" }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { id: string };
    expect(typeof data.id).toBe("string");
    expect(data.id.length).toBeGreaterThan(0);
  });

  it("GET /api/files?parent_id=X lists files in folder", async () => {
    // Create folder first
    const folderRes = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "My Folder" }),
    });
    const { id: folderId } = (await folderRes.json()) as { id: string };

    // Create file inside folder
    const fileRes = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "Nested Folder", parent_id: folderId }),
    });
    expect(fileRes.status).toBe(201);

    // List files in parent folder
    const listRes = await SELF.fetch(
      `http://localhost/api/files?parent_id=${folderId}`,
      {
        headers: authHeaders(token),
      }
    );
    expect(listRes.status).toBe(200);
    const data = (await listRes.json()) as { files: { name: string }[] };
    expect(data.files).toHaveLength(1);
    expect(data.files[0].name).toBe("Nested Folder");
  });

  it("POST /api/files with multipart FormData uploads file", async () => {
    const formData = new FormData();
    const blob = new Blob(["hello world"], { type: "text/plain" });
    formData.append("file", blob, "hello.txt");

    const res = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { id: string };
    expect(typeof data.id).toBe("string");
  });

  it("PATCH /api/files/:id renames file", async () => {
    // Create a folder
    const createRes = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "OldName" }),
    });
    const { id } = (await createRes.json()) as { id: string };

    // Rename
    const patchRes = await SELF.fetch(`http://localhost/api/files/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "NewName" }),
    });
    expect(patchRes.status).toBe(200);
    const patchData = (await patchRes.json()) as { ok: boolean };
    expect(patchData.ok).toBe(true);

    // Verify rename
    const getRes = await SELF.fetch(`http://localhost/api/files/${id}`, {
      headers: authHeaders(token),
    });
    const file = (await getRes.json()) as { name: string };
    expect(file.name).toBe("NewName");
  });

  it("DELETE /api/files/:id soft deletes file", async () => {
    // Create a file
    const createRes = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "ToDelete" }),
    });
    const { id } = (await createRes.json()) as { id: string };

    // Delete
    const deleteRes = await SELF.fetch(`http://localhost/api/files/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    expect(deleteRes.status).toBe(200);
    const deleteData = (await deleteRes.json()) as { ok: boolean };
    expect(deleteData.ok).toBe(true);

    // Confirm not in list
    const listRes = await SELF.fetch("http://localhost/api/files", {
      headers: authHeaders(token),
    });
    const data = (await listRes.json()) as { files: unknown[] };
    expect(data.files).toHaveLength(0);
  });

  it("GET /api/files/:id/download returns file content from R2", async () => {
    // Upload a file
    const formData = new FormData();
    const content = "file content for download test";
    const blob = new Blob([content], { type: "text/plain" });
    formData.append("file", blob, "download-test.txt");

    const uploadRes = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const { id } = (await uploadRes.json()) as { id: string };

    // Download
    const downloadRes = await SELF.fetch(
      `http://localhost/api/files/${id}/download`,
      {
        headers: authHeaders(token),
      }
    );
    expect(downloadRes.status).toBe(200);
    const body = await downloadRes.text();
    expect(body).toBe(content);
  });

  it("POST /api/files/batch with action delete deletes multiple files", async () => {
    // Create two files
    const res1 = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "Batch1" }),
    });
    const { id: id1 } = (await res1.json()) as { id: string };

    const res2 = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "Batch2" }),
    });
    const { id: id2 } = (await res2.json()) as { id: string };

    // Batch delete
    const batchRes = await SELF.fetch("http://localhost/api/files/batch", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ action: "delete", ids: [id1, id2] }),
    });
    expect(batchRes.status).toBe(200);
    const batchData = (await batchRes.json()) as { ok: boolean };
    expect(batchData.ok).toBe(true);

    // Confirm both are gone from list
    const listRes = await SELF.fetch("http://localhost/api/files", {
      headers: authHeaders(token),
    });
    const data = (await listRes.json()) as { files: unknown[] };
    expect(data.files).toHaveLength(0);
  });
});
