import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { SELF, env } from "cloudflare:test";
import { getAuthToken, authHeaders } from "./helpers";
import { clearPathCache } from "../src/routes/dav";

const BASIC_AUTH = "Basic " + btoa("user:testpass");

function davHeaders(extra?: Record<string, string>): Record<string, string> {
  return { Authorization: BASIC_AUTH, ...extra };
}

describe("WebDAV integration", () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  beforeEach(async () => {
    clearPathCache();
    await env.DB.exec("DELETE FROM file_versions");
    await env.DB.exec("DELETE FROM shares");
    await env.DB.exec("DELETE FROM files");
  });

  describe("OPTIONS", () => {
    it("returns DAV headers without auth", async () => {
      const res = await SELF.fetch("http://localhost/dav/", {
        method: "OPTIONS",
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("DAV")).toBe("1");
      expect(res.headers.get("Allow")).toContain("PROPFIND");
      expect(res.headers.get("Allow")).toContain("GET");
    });
  });

  describe("PROPFIND", () => {
    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/dav/", {
        method: "PROPFIND",
        headers: { Depth: "1" },
      });
      expect(res.status).toBe(401);
      expect(res.headers.get("WWW-Authenticate")).toContain("Basic");
    });

    it("lists root directory with DAV headers", async () => {
      const res = await SELF.fetch("http://localhost/dav/", {
        method: "PROPFIND",
        headers: davHeaders({ Depth: "1" }),
      });
      expect(res.status).toBe(207);
      expect(res.headers.get("DAV")).toBe("1");
      expect(res.headers.get("Content-Type")).toContain("application/xml");

      const xml = await res.text();
      expect(xml).toContain("<D:multistatus");
      expect(xml).toContain("<D:collection/>");
      expect(xml).toContain("<D:getlastmodified>");
      expect(xml).toContain("<D:getcontentlength>0</D:getcontentlength>");
    });

    it("lists children of root", async () => {
      await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ name: "Movies" }),
      });

      const res = await SELF.fetch("http://localhost/dav/", {
        method: "PROPFIND",
        headers: davHeaders({ Depth: "1" }),
      });
      expect(res.status).toBe(207);
      const xml = await res.text();
      expect(xml).toContain("Movies");
    });

    it("navigates into subdirectory", async () => {
      const folderRes = await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ name: "Videos" }),
      });
      const { id: folderId } = (await folderRes.json()) as { id: string };

      const formData = new FormData();
      formData.append("file", new Blob(["data"], { type: "video/mp4" }), "movie.mp4");
      formData.append("parent_id", folderId);
      await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const res = await SELF.fetch("http://localhost/dav/Videos", {
        method: "PROPFIND",
        headers: davHeaders({ Depth: "1" }),
      });
      expect(res.status).toBe(207);
      const xml = await res.text();
      expect(xml).toContain("movie.mp4");
      expect(xml).toContain("video/mp4");
    });

    it("returns 404 for non-existent path", async () => {
      const res = await SELF.fetch("http://localhost/dav/nonexistent", {
        method: "PROPFIND",
        headers: davHeaders({ Depth: "0" }),
      });
      expect(res.status).toBe(404);
    });

    it("Depth: 0 does not list children", async () => {
      await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ name: "Docs" }),
      });

      const res = await SELF.fetch("http://localhost/dav/", {
        method: "PROPFIND",
        headers: davHeaders({ Depth: "0" }),
      });
      expect(res.status).toBe(207);
      const xml = await res.text();
      expect(xml).not.toContain("Docs");
    });
  });

  describe("GET (file download + Range)", () => {
    let fileId: string;

    beforeEach(async () => {
      const content = "A".repeat(1000);
      const formData = new FormData();
      formData.append("file", new Blob([content], { type: "video/mp4" }), "test.mp4");
      const res = await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await res.json()) as { id: string };
      fileId = data.id;
    });

    it("returns full file with correct headers", async () => {
      const res = await SELF.fetch("http://localhost/dav/test.mp4", {
        headers: davHeaders(),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("video/mp4");
      expect(res.headers.get("Content-Length")).toBe("1000");
      expect(res.headers.get("Accept-Ranges")).toBe("bytes");
      expect(res.headers.get("ETag")).toBeTruthy();
      expect(res.headers.get("Last-Modified")).toBeTruthy();
      const body = await res.text();
      expect(body.length).toBe(1000);
    });

    it("supports Range requests (partial content)", async () => {
      const res = await SELF.fetch("http://localhost/dav/test.mp4", {
        headers: davHeaders({ Range: "bytes=0-99" }),
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("Content-Range")).toBe("bytes 0-99/1000");
      expect(res.headers.get("Content-Length")).toBe("100");
      const body = await res.arrayBuffer();
      expect(body.byteLength).toBe(100);
    });

    it("supports Range request without end", async () => {
      const res = await SELF.fetch("http://localhost/dav/test.mp4", {
        headers: davHeaders({ Range: "bytes=900-" }),
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("Content-Range")).toBe("bytes 900-999/1000");
      expect(res.headers.get("Content-Length")).toBe("100");
      await res.arrayBuffer();
    });

    it("returns 404 for non-existent file", async () => {
      const res = await SELF.fetch("http://localhost/dav/nofile.mp4", {
        headers: davHeaders(),
      });
      expect(res.status).toBe(404);
      await res.arrayBuffer();
    });

    it("returns 404 for directory GET", async () => {
      await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ name: "DirOnly" }),
      });
      const res = await SELF.fetch("http://localhost/dav/DirOnly", {
        headers: davHeaders(),
      });
      expect(res.status).toBe(404);
      await res.arrayBuffer();
    });
  });

  describe("HEAD", () => {
    beforeEach(async () => {
      const formData = new FormData();
      formData.append("file", new Blob(["content"], { type: "audio/mpeg" }), "song.mp3");
      await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    });

    it("returns file metadata without body", async () => {
      const res = await SELF.fetch("http://localhost/dav/song.mp3", {
        method: "HEAD",
        headers: davHeaders(),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
      expect(res.headers.get("Content-Length")).toBe("7");
      expect(res.headers.get("Accept-Ranges")).toBe("bytes");
      expect(res.headers.get("ETag")).toBeTruthy();
      expect(res.headers.get("Last-Modified")).toBeTruthy();
    });
  });

  describe("repeated access (cache behavior)", () => {
    it("multiple requests to same file succeed", async () => {
      const formData = new FormData();
      formData.append("file", new Blob(["cached"], { type: "text/plain" }), "cached.txt");
      await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const res1 = await SELF.fetch("http://localhost/dav/cached.txt", {
        headers: davHeaders(),
      });
      expect(res1.status).toBe(200);
      expect(await res1.text()).toBe("cached");

      const res2 = await SELF.fetch("http://localhost/dav/cached.txt", {
        headers: davHeaders(),
      });
      expect(res2.status).toBe(200);
      expect(await res2.text()).toBe("cached");
    });

    it("deep path access works on repeated requests", async () => {
      const folderRes = await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ name: "Level1" }),
      });
      const { id: l1Id } = (await folderRes.json()) as { id: string };

      const subRes = await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ name: "Level2", parent_id: l1Id }),
      });
      const { id: l2Id } = (await subRes.json()) as { id: string };

      const formData = new FormData();
      formData.append("file", new Blob(["deep"], { type: "text/plain" }), "deep.txt");
      formData.append("parent_id", l2Id);
      await SELF.fetch("http://localhost/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const res1 = await SELF.fetch("http://localhost/dav/Level1/Level2/deep.txt", {
        headers: davHeaders(),
      });
      expect(res1.status).toBe(200);
      expect(await res1.text()).toBe("deep");

      const res2 = await SELF.fetch("http://localhost/dav/Level1/Level2/deep.txt", {
        headers: davHeaders(),
      });
      expect(res2.status).toBe(200);
      expect(await res2.text()).toBe("deep");
    });
  });
});
