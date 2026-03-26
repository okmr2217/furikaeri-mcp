const COOKIE_NAME = "furikaeri_admin";
const SESSION_PAYLOAD = "admin-session-v1";

export async function signAdminToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(SESSION_PAYLOAD));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminCookie(cookieHeader: string | null, secret: string): Promise<boolean> {
  if (!cookieHeader) return false;
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!token) return false;
  const expected = await signAdminToken(secret);
  return token === expected;
}

export function makeAdminCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`;
}

export function clearAdminCookie(): string {
  return `${COOKIE_NAME}=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
