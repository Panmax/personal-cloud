import { Hono } from "hono";
import type { Env } from "../types";
import { searchFiles } from "../db/queries";

const search = new Hono<{ Bindings: Env }>();

search.get("/", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ files: [] });
  const results = await searchFiles(c.env.DB, q);
  return c.json({ files: results });
});

export { search };
