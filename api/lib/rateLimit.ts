import { TRPCError } from "@trpc/server";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
};

const buckets = new Map<string, Bucket>();

export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function rateLimitKey(headers: Headers, scope: string, identity?: string) {
  return `${scope}:${identity || clientIp(headers)}`;
}

export function checkRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const bucket = buckets.get(options.key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (bucket.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        options.message ||
        `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.`,
    });
  }

  bucket.count += 1;
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
