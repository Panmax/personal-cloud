import { Hono } from "hono";
import type { Env } from "../types";
import { basicAuthMiddleware } from "../middleware/basic-auth";
import { resolvePathToFile, listChildrenByParentId } from "../db/dav-queries";
import { buildMultistatus } from "../utils/dav-xml";

const dav = new Hono<{ Bindings: Env }>();

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

  if (segments.length === 0) {
    const children = depth === "0" ? [] : await listChildrenByParentId(c.env.DB, null);
    const xml = buildMultistatus("/dav/", null, children, true);
    return new Response(xml, {
      status: 207,
      headers: { "Content-Type": "application/xml; charset=utf-8", DAV: "1" },
    });
  }

  const file = await resolvePathToFile(c.env.DB, segments);
  if (!file) return c.notFound();

  const basePath = "/dav/" + segments.map(encodeURIComponent).join("/");
  const children = file.is_dir && depth !== "0"
    ? await listChildrenByParentId(c.env.DB, file.id)
    : [];

  const xml = buildMultistatus(basePath, file, children, false);
  return new Response(xml, {
    status: 207,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
});

dav.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/dav\/?/, "");
  const segments = getPathSegments(path);

  if (segments.length === 0) return c.notFound();

  const file = await resolvePathToFile(c.env.DB, segments);
  if (!file || !file.r2_key || file.is_dir) return c.notFound();

  const rangeHeader = c.req.header("Range");
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1]);
      const end = match[2] ? parseInt(match[2]) : file.size - 1;
      const object = await c.env.BUCKET.get(file.r2_key, {
        range: { offset: start, length: end - start + 1 },
      });
      if (!object) return c.notFound();
      return new Response(object.body, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${file.size}`,
          "Content-Length": String(end - start + 1),
          "Content-Type": file.mime_type || "application/octet-stream",
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  const object = await c.env.BUCKET.get(file.r2_key);
  if (!object) return c.notFound();

  return new Response(object.body, {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Length": String(file.size),
      "Accept-Ranges": "bytes",
    },
  });
});

dav.on("HEAD", "/*", async (c) => {
  const path = c.req.path.replace(/^\/dav\/?/, "");
  const segments = getPathSegments(path);

  if (segments.length === 0) return c.notFound();

  const file = await resolvePathToFile(c.env.DB, segments);
  if (!file || file.is_dir) return c.notFound();

  return new Response(null, {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Length": String(file.size),
      "Accept-Ranges": "bytes",
    },
  });
});

export { dav };
