import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { SELF, env } from "cloudflare:test";
import { getAuthToken, authHeaders } from "./helpers";

describe("versions integration", () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  beforeEach(async () => {
    await env.DB.exec("DELETE FROM file_versions");
    await env.DB.exec("DELETE FROM shares");
    await env.DB.exec("DELETE FROM files");
  });

  async function uploadFile(
    name: string,
    content: string
  ): Promise<{ id: string; versioned: boolean }> {
    const formData = new FormData();
    const blob = new Blob([content], { type: "text/plain" });
    formData.append("file", blob, name);
    const res = await SELF.fetch("http://localhost/api/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.json() as Promise<{ id: string; versioned: boolean }>;
  }

  it("uploading same filename again creates a version", async () => {
    const first = await uploadFile("test.txt", "version 1 content");
    expect(first.id).toBeTruthy();

    const second = await uploadFile("test.txt", "version 2 content");
    // Re-upload of same name returns 200 with versioned: true
    expect(second.versioned).toBe(true);
    expect(second.id).toBe(first.id);
  });

  it("GET /api/files/:id/versions lists versions", async () => {
    const first = await uploadFile("versioned.txt", "v1");
    expect(first.id).toBeTruthy();
    const second = await uploadFile("versioned.txt", "v2");
    expect(second.versioned).toBe(true);

    const res = await SELF.fetch(
      `http://localhost/api/files/${first.id}/versions`,
      {
        headers: authHeaders(token),
      }
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      versions: { id: string; version: number }[];
    };
    expect(data.versions).toHaveLength(1);
  });

  it("POST /api/files/:id/revert reverts to a previous version", async () => {
    const first = await uploadFile("revert.txt", "original content");
    await uploadFile("revert.txt", "updated content");

    // Get versions
    const versionsRes = await SELF.fetch(
      `http://localhost/api/files/${first.id}/versions`,
      {
        headers: authHeaders(token),
      }
    );
    const versionsData = (await versionsRes.json()) as {
      versions: { id: string }[];
    };
    const versionId = versionsData.versions[0].id;

    // Revert
    const revertRes = await SELF.fetch(
      `http://localhost/api/files/${first.id}/revert`,
      {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ version_id: versionId }),
      }
    );
    expect(revertRes.status).toBe(200);
    const revertData = (await revertRes.json()) as { ok: boolean };
    expect(revertData.ok).toBe(true);

    // After revert, there should now be 2 versions (original saved as a version)
    const versionsAfterRes = await SELF.fetch(
      `http://localhost/api/files/${first.id}/versions`,
      {
        headers: authHeaders(token),
      }
    );
    const versionsAfterData = (await versionsAfterRes.json()) as {
      versions: unknown[];
    };
    expect(versionsAfterData.versions).toHaveLength(2);
  });

  it("DELETE /api/files/:id/versions/:vid deletes specific version", async () => {
    const first = await uploadFile("del-version.txt", "v1 content");
    await uploadFile("del-version.txt", "v2 content");

    // Get versions
    const versionsRes = await SELF.fetch(
      `http://localhost/api/files/${first.id}/versions`,
      {
        headers: authHeaders(token),
      }
    );
    const versionsData = (await versionsRes.json()) as {
      versions: { id: string }[];
    };
    const versionId = versionsData.versions[0].id;

    // Delete version
    const deleteRes = await SELF.fetch(
      `http://localhost/api/files/${first.id}/versions/${versionId}`,
      {
        method: "DELETE",
        headers: authHeaders(token),
      }
    );
    expect(deleteRes.status).toBe(200);
    const deleteData = (await deleteRes.json()) as { ok: boolean };
    expect(deleteData.ok).toBe(true);

    // Confirm version is gone
    const versionsAfterRes = await SELF.fetch(
      `http://localhost/api/files/${first.id}/versions`,
      {
        headers: authHeaders(token),
      }
    );
    const versionsAfterData = (await versionsAfterRes.json()) as {
      versions: unknown[];
    };
    expect(versionsAfterData.versions).toHaveLength(0);
  });
});
