// The OTP is encrypted so it cannot be redeemed directly to bypass our expiry.
const encoder = new TextEncoder();
const TTL_MS = 5 * 60 * 1000;
const PURPOSE = encoder.encode("mandalario:checkout-handoff:v1");

type Ticket = { userId: string; tokenHash: string; expiresAt: number };

async function encryptionKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`checkout-handoff:v1:${secret}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function issueTicket(userId: string, tokenHash: string, secret: string, now = Date.now()) {
  const expiresAt = now + TTL_MS;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: PURPOSE },
    await encryptionKey(secret),
    encoder.encode(JSON.stringify({ userId, tokenHash, expiresAt })),
  );
  const bytes = new Uint8Array(iv.length + encrypted.byteLength);
  bytes.set(iv);
  bytes.set(new Uint8Array(encrypted), iv.length);
  const ticket = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { ticket, expiresAt };
}

export async function readTicket(value: unknown, secret: string, now = Date.now()): Promise<Ticket> {
  if (typeof value !== "string" || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid ticket");
  }
  const bytes = Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: PURPOSE },
    await encryptionKey(secret),
    bytes.slice(12),
  );
  const ticket = JSON.parse(new TextDecoder().decode(plaintext));
  if (typeof ticket.userId !== "string" || !ticket.userId ||
      typeof ticket.tokenHash !== "string" || !ticket.tokenHash ||
      !Number.isFinite(ticket.expiresAt) || ticket.expiresAt <= now || ticket.expiresAt > now + TTL_MS) {
    throw new Error("Expired or invalid ticket");
  }
  return ticket;
}
