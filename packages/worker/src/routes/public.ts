import { Hono } from "hono";
import type { Env } from "../types";

const publicRoutes = new Hono<{ Bindings: Env }>();

export { publicRoutes };
