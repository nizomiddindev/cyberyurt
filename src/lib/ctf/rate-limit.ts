export class SlidingWindowRateLimiter {
  private readonly timestamps = new Map<string, number[]>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  checkAndRecord(key: string, now = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const cutoff = now - this.windowMs;
    const prev = (this.timestamps.get(key) ?? []).filter((ts) => ts > cutoff);

    if (prev.length >= this.maxAttempts) {
      const oldest = prev[0] ?? now;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + this.windowMs - now) / 1000),
      );
      this.timestamps.set(key, prev);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    prev.push(now);
    this.timestamps.set(key, prev);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxAttempts - prev.length),
      retryAfterSeconds: 0,
    };
  }

  reset(key?: string): void {
    if (key) {
      this.timestamps.delete(key);
    } else {
      this.timestamps.clear();
    }
  }
}

// Shared per-process limiter: max 5 flag attempts per 60 seconds per user/guest
export const flagRateLimiter = new SlidingWindowRateLimiter(5, 60_000);
