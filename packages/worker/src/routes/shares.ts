import { Hono } from "hono";
import type { Env } from "../types";

const shares = new Hono<{ Bindings: Env }>();

export { shares };
