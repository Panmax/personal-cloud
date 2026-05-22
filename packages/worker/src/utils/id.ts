import { nanoid } from "nanoid";

export function generateId(): string {
  return nanoid(21);
}

export function generateShareId(): string {
  return nanoid(8);
}
