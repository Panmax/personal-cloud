import { Hono } from "hono";
import type { Env } from "../types";

const upload = new Hono<{ Bindings: Env }>();

export { upload };
