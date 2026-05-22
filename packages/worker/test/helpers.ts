import { env, SELF } from "cloudflare:test";

export function getTestEnv() {
  return env;
}

export async function getAuthToken(): Promise<string> {
  const res = await SELF.fetch("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "testpass" }),
  });
  const data = (await res.json()) as { token: string };
  return data.token;
}

export function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
