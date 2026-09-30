import crypto from "node:crypto";

export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || "";
}

export function safeEqualSecret(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function commerceProvisionAuthorized(request: Request): boolean {
  const expected = process.env.COMMERCEFLOW_PROVISION_TOKEN?.trim() || "";
  return safeEqualSecret(bearerToken(request), expected);
}

export function stableProvisionIdentity(externalRef: string): { username: string; candidateNo: string } {
  const ref = externalRef.trim();
  if (!ref) throw new Error("externalRef 不能为空");
  const digest = crypto.createHash("sha256").update(ref, "utf8").digest("hex").toUpperCase();
  return {
    username: `cf_${digest.slice(0, 16).toLowerCase()}`,
    candidateNo: `CF-${digest.slice(0, 16)}`,
  };
}
