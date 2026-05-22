import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { SELF, env } from "cloudflare:test";
import { getAuthToken, authHeaders } from "./helpers";

describe("search integration", () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  beforeEach(async () => {
    await env.DB.exec("DELETE FROM file_versions");
    await env.DB.exec("DELETE FROM shares");
    await env.DB.exec("DELETE FROM files");
  });

  async function createFolder(name: string): Promise<string> {
    const res = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { id: string };
    return data.id;
  }

  it("GET /api/search?q=photo returns matching files", async () => {
    await createFolder("vacation-photo.jpg");
    await createFolder("report.pdf");
    await createFolder("photo-album");

    const res = await SELF.fetch("http://localhost/api/search?q=photo", {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { files: { name: string }[] };
    expect(data.files).toHaveLength(2);
    const names = data.files.map((f) => f.name);
    expect(names).toContain("vacation-photo.jpg");
    expect(names).toContain("photo-album");
  });

  it("GET /api/search?q=nonexistent returns empty array", async () => {
    await createFolder("some-file.txt");

    const res = await SELF.fetch(
      "http://localhost/api/search?q=nonexistent",
      {
        headers: authHeaders(token),
      }
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { files: unknown[] };
    expect(data.files).toHaveLength(0);
  });

  it("GET /api/search with no query returns empty array", async () => {
    await createFolder("some-file.txt");

    const res = await SELF.fetch("http://localhost/api/search", {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { files: unknown[] };
    expect(data.files).toHaveLength(0);
  });
});
