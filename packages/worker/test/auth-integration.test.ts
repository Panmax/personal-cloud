import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe("auth integration", () => {
  it("POST /api/auth/login with correct password returns 200 + token", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "testpass" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { token?: string };
    expect(typeof data.token).toBe("string");
    expect(data.token!.length).toBeGreaterThan(0);
  });

  it("POST /api/auth/login with wrong password returns 401", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrongpassword" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/files without auth returns 401", async () => {
    const res = await SELF.fetch("http://localhost/api/files");
    expect(res.status).toBe(401);
  });

  it("GET /api/files with invalid token returns 401", async () => {
    const res = await SELF.fetch("http://localhost/api/files", {
      headers: { Authorization: "Bearer invalid.token.here" },
    });
    expect(res.status).toBe(401);
  });
});
