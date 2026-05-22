import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { handleCron } from "./cron";
import { authMiddleware } from "./middleware/auth";
import { auth } from "./routes/auth";
import { files } from "./routes/files";
import { upload } from "./routes/upload";
import { versions } from "./routes/versions";
import { trash } from "./routes/trash";
import { search } from "./routes/search";
import { shares } from "./routes/shares";
import { publicRoutes } from "./routes/public";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors({ exposeHeaders: ["etag"] }));
app.route("/api/auth", auth);
app.route("/s", publicRoutes);
app.use("/api/*", authMiddleware);
app.route("/api/files", files);
app.route("/api/files", versions);
app.route("/api/upload", upload);
app.route("/api/trash", trash);
app.route("/api/search", search);
app.route("/api/shares", shares);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env));
  },
};
