import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Checks that a webhook really came from Resend (which signs with Svix). The signed text is `${svix-id}.${svix-timestamp}.${raw body}`, signed
 * with HMAC-SHA256 using the endpoint's secret (`whsec_` then base64). The header can hold several `v1,<base64>` signatures (a secret being
 * rotated), and one match is enough. A timestamp more than five minutes from now is refused, so a recorded request can't be replayed later.
 * Nothing from the body is read until this has passed. Spec: https://docs.svix.com/receiving/verifying-payloads/how-manual
 */
export const TOLERANCE_SECONDS = 300;
export function verifySvix(secret: string, headers: { id?: string; timestamp?: string; signature?: string }, rawBody: string, nowMs = Date.now()): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret.startsWith("whsec_") || !id || !timestamp || !signature) return false;
  if (!/^\d{9,12}$/.test(timestamp) || id.length > 200) return false;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  let key: Buffer;
  try { key = Buffer.from(secret.slice(6), "base64"); } catch { return false; }
  if (key.length < 16) return false;
  const want = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  for (const part of signature.split(" ").slice(0, 10)) {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) continue;
    const given = Buffer.from(value, "base64");
    if (given.length === want.length && timingSafeEqual(given, want)) return true;
  }
  return false;
}
