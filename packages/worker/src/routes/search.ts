import { Hono } from "hono";
import type { Env } from "../types";

const search = new Hono<{ Bindings: Env }>();

export { search };
