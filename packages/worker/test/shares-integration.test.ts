import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { SELF, env } from "cloudflare:test";
import { getAuthToken, authHeaders } from "./helpers";

describe("shares integration", () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  beforeEach(async () => {
    await env.DB.exec("DELETE FROM file_versions");
    await env.DB.exec("DELETE FROM shares");
    await env.DB.exec("DELETE FROM files");
  });

  async function uploadFile(name: string, content: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([content], { type: "text/plain" });
    formData.append("file", blob, name);
    const res = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = (await res.json()) as { id: string };
    return data.id;
  }

  it("POST /api/shares creates share link and returns id + url", async () => {
    const fileId = await uploadFile("shared.txt", "share test content");

    const res = await SELF.fetch("http://localhost/api/shares", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ file_id: fileId }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { id: string; url: string };
    expect(typeof data.id).toBe("string");
    expect(data.url).toBe(`/s/${data.id}`);
  });

  it("GET /api/shares lists shares with file_name", async () => {
    const fileId = await uploadFile("list-shares.txt", "content");

    await SELF.fetch("http://localhost/api/shares", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ file_id: fileId }),
    });

    const res = await SELF.fetch("http://localhost/api/shares", {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      shares: { file_id: string; file_name: string | null }[];
    };
    expect(data.shares).toHaveLength(1);
    expect(data.shares[0].file_id).toBe(fileId);
    expect(data.shares[0].file_name).toBe("list-shares.txt");
  });

  it("DELETE /api/shares/:id revokes share", async () => {
    const fileId = await uploadFile("revoke-share.txt", "content");

    const createRes = await SELF.fetch("http://localhost/api/shares", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ file_id: fileId }),
    });
    const { id: shareId } = (await createRes.json()) as { id: string };

    const deleteRes = await SELF.fetch(
      `http://localhost/api/shares/${shareId}`,
      {
        method: "DELETE",
        headers: authHeaders(token),
      }
    );
    expect(deleteRes.status).toBe(200);

    // Confirm share gone from list
    const listRes = await SELF.fetch("http://localhost/api/shares", {
      headers: authHeaders(token),
    });
    const listData = (await listRes.json()) as { shares: unknown[] };
    expect(listData.shares).toHaveLength(0);
  });

  it("GET /s/:id returns file info without auth", async () => {
    const fileId = await uploadFile("public-file.txt", "public content");

    const createRes = await SELF.fetch("http://localhost/api/shares", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ file_id: fileId }),
    });
    const { id: shareId } = (await createRes.json()) as { id: string };

    // No auth header
    const publicRes = await SELF.fetch(`http://localhost/s/${shareId}`);
    expect(publicRes.status).toBe(200);
    const data = (await publicRes.json()) as {
      filename: string;
      has_password: boolean;
    };
    expect(data.filename).toBe("public-file.txt");
    expect(data.has_password).toBe(false);
  });

  it("POST /s/:id/download downloads file without auth", async () => {
    const content = "downloadable content";
    const fileId = await uploadFile("dl-file.txt", content);

    const createRes = await SELF.fetch("http://localhost/api/shares", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ file_id: fileId }),
    });
    const { id: shareId } = (await createRes.json()) as { id: string };

    const dlRes = await SELF.fetch(`http://localhost/s/${shareId}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(dlRes.status).toBe(200);
    const body = await dlRes.text();
    expect(body).toBe(content);
  });

  it("POST /s/:id/download with wrong password returns 401", async () => {
    const fileId = await uploadFile("pw-protected.txt", "secret content");

    const createRes = await SELF.fetch("http://localhost/api/shares", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ file_id: fileId, password: "correctpass" }),
    });
    const { id: shareId } = (await createRes.json()) as { id: string };

    const dlRes = await SELF.fetch(`http://localhost/s/${shareId}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrongpass" }),
    });
    expect(dlRes.status).toBe(401);
  });
});
