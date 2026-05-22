import { Hono } from "hono";
import type { Env } from "../types";

const trash = new Hono<{ Bindings: Env }>();

export { trash };
