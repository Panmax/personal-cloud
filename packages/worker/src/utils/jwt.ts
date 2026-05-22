// JWT utilities using Web Crypto API (HS256)
// Compatible with Cloudflare Workers environment

function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.byteLength; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeJson(obj: object): string {
  const json = JSON.stringify(obj);
  const encoder = new TextEncoder();
  return base64urlEncode(encoder.encode(json));
}

async function hmacSign(secret: string, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  return new Uint8Array(signature);
}

async function hmacVerify(
  secret: string,
  message: string,
  signature: Uint8Array
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify("HMAC", key, signature, msgData);
}

export async function signJwt(
  secret: string,
  expiresInDays: number = 7
): Promise<string> {
  const header = encodeJson({ alg: "HS256", typ: "JWT" });

  const now = Math.floor(Date.now() / 1000);
  const payload = encodeJson({
    iat: now,
    exp: now + expiresInDays * 24 * 60 * 60,
  });

  const signingInput = `${header}.${payload}`;
  const signatureBytes = await hmacSign(secret, signingInput);
  const signature = base64urlEncode(signatureBytes);

  return `${signingInput}.${signature}`;
}

export async function verifyJwt(
  token: string,
  secret: string
): Promise<{ valid: boolean }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    // Verify signature
    const signatureBytes = base64urlDecode(signatureB64);
    const isValid = await hmacVerify(secret, signingInput, signatureBytes);
    if (!isValid) {
      return { valid: false };
    }

    // Verify expiration
    const payloadBytes = base64urlDecode(payloadB64);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadJson) as { exp?: number };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp !== undefined && payload.exp < now) {
      return { valid: false };
    }

    return { valid: true };
  } catch {
    return { valid: false };
  }
}
