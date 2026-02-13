type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const current = buckets.get(options.key);

  if (!current || current.resetAt <= now) {
    const next: Bucket = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    buckets.set(options.key, next);
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt: next.resetAt,
    };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  buckets.set(options.key, current);

  return {
    allowed: true,
    remaining: options.limit - current.count,
    resetAt: current.resetAt,
  };
}
