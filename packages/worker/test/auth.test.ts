import { describe, it, expect } from "vitest";
import { signJwt, verifyJwt } from "../src/utils/jwt";

describe("JWT utils", () => {
  const secret = "test-secret";

  it("signs and verifies a valid token", async () => {
    const token = await signJwt(secret);
    const result = await verifyJwt(token, secret);
    expect(result.valid).toBe(true);
  });

  it("rejects an expired token", async () => {
    const token = await signJwt(secret, -1);
    const result = await verifyJwt(token, secret);
    expect(result.valid).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const token = await signJwt(secret);
    const tampered = token.slice(0, -5) + "xxxxx";
    const result = await verifyJwt(tampered, secret);
    expect(result.valid).toBe(false);
  });
});
