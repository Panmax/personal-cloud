import { Hono } from "hono";
import type { Env } from "../types";

const versions = new Hono<{ Bindings: Env }>();

export { versions };
