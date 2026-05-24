import { Hono } from "hono";
import type { Env, FileRecord } from "../types";
import { basicAuthMiddleware } from "../middleware/basic-auth";
import { resolvePathToFile, listChildrenByParentId } from "../db/dav-queries";
import { buildMultistatus } from "../utils/dav-xml";

const dav = new Hono<{ Bindings: Env }>();

const PATH_CACHE_MAX = 256;
const pathCache = new Map<string, { file: FileRecord; ts: number }>();

function getCachedFile(key: string): FileRecord | null {
  const entry = pathCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > 60_000) {
    pathCache.delete(key);
    return null;
  }
  return entry.file;
}

function setCachedFile(key: string, file: FileRecord): void {
  if (pathCache.size >= PATH_CACHE_MAX) {
    const oldest = pathCache.keys().next().value!;
    pathCache.delete(oldest);
  }
  pathCache.set(key, { file, ts: Date.now() });
}

function getPathSegments(path: string): string[] {
  return path.split("/").filter(Boolean).map(decodeURIComponent);
}

dav.on("OPTIONS", ["/*", "/"], () => {
  return new Response(null, {
    status: 200,
    headers: {
      DAV: "1",
      Allow: "OPTIONS, PROPFIND, GET, HEAD",
      "MS-Author-Via": "DAV",
    },
  });
});

dav.use("/*", basicAuthMiddleware);

dav.on("PROPFIND", ["/*", "/"], async (c) => {
  const path = c.req.path.replace(/^\/dav\/?/, "");
  const segments = getPathSegments(path);
  const depth = c.req.header("Depth") || "1";

  const davHeaders = {
    "Content-Type": "application/xml; charset=utf-8",
    DAV: "1",
    Allow: "OPTIONS, PROPFIND, GET, HEAD",
  };

  if (segments.length === 0) {
    const children = depth === "0" ? [] : await listChildrenByParentId(c.env.DB, null);
    const xml = buildMultistatus("/dav/", null, children, true);
    return new Response(xml, { status: 207, headers: davHeaders });
  }

  const file = await resolvePathToFile(c.env.DB, segments);
  if (!file) return c.notFound();

  const basePath = "/dav/" + segments.map(encodeURIComponent).join("/");
  const children = file.is_dir && depth !== "0"
    ? await listChildrenByParentId(c.env.DB, file.id)
    : [];

  const xml = buildMultistatus(basePath, file, children, false);
  return new Response(xml, { status: 207, headers: davHeaders });
});

dav.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/dav\/?/, "");
  const segments = getPathSegments(path);

  if (segments.length === 0) return c.notFound();

  const cacheKey = segments.join("/");
  let file = getCachedFile(cacheKey);
  if (!file) {
    file = await resolvePathToFile(c.env.DB, segments);
    if (file) setCachedFile(cacheKey, file);
  }
  if (!file || !file.r2_key || file.is_dir) return c.notFound();

  const lastModified = new Date(file.updated_at).toUTCString();
  const etag = `"${file.id}-${file.size}"`;

  const rangeHeader = c.req.header("Range");
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1]);
      const end = match[2] ? parseInt(match[2]) : file.size - 1;
      let object = await c.env.BUCKET.get(file.r2_key, {
        range: { offset: start, length: end - start + 1 },
      });
      if (!object) {
        pathCache.delete(cacheKey);
        file = await resolvePathToFile(c.env.DB, segments);
        if (!file || !file.r2_key) return c.notFound();
        setCachedFile(cacheKey, file);
        object = await c.env.BUCKET.get(file.r2_key, {
          range: { offset: start, length: end - start + 1 },
        });
        if (!object) return c.notFound();
      }
      return new Response(object.body, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${file.size}`,
          "Content-Length": String(end - start + 1),
          "Content-Type": file.mime_type || "application/octet-stream",
          "Accept-Ranges": "bytes",
          "Last-Modified": lastModified,
          ETag: etag,
        },
      });
    }
  }

  let object = await c.env.BUCKET.get(file.r2_key);
  if (!object) {
    pathCache.delete(cacheKey);
    file = await resolvePathToFile(c.env.DB, segments);
    if (!file || !file.r2_key) return c.notFound();
    setCachedFile(cacheKey, file);
    object = await c.env.BUCKET.get(file.r2_key);
    if (!object) return c.notFound();
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Length": String(file.size),
      "Accept-Ranges": "bytes",
      "Last-Modified": lastModified,
      ETag: etag,
    },
  });
});

dav.on("HEAD", "/*", async (c) => {
  const path = c.req.path.replace(/^\/dav\/?/, "");
  const segments = getPathSegments(path);

  if (segments.length === 0) return c.notFound();

  const cacheKey = segments.join("/");
  let file = getCachedFile(cacheKey);
  if (!file) {
    file = await resolvePathToFile(c.env.DB, segments);
    if (file) setCachedFile(cacheKey, file);
  }
  if (!file || file.is_dir) return c.notFound();

  return new Response(null, {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Length": String(file.size),
      "Accept-Ranges": "bytes",
      "Last-Modified": new Date(file.updated_at).toUTCString(),
      ETag: `"${file.id}-${file.size}"`,
    },
  });
});

function clearPathCache() {
  pathCache.clear();
}

export { dav, clearPathCache };
