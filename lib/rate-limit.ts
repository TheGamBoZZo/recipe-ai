/**
 * Simple in-memory rate limiter for API routes.
 * Keyed by user ID. Resets after windowMs.
 *
 * For production with multiple serverless instances, swap the Map for
 * a Redis/Upstash store — but this stops abuse from a single user.
 */

interface Entry { count: number; resetAt: number; }
const store = new Map<string, Entry>();

export function rateLimit(
  userId: string,
  opts: { maxRequests?: number; windowMs?: number } = {}
): { allowed: boolean; retryAfterMs: number } {
  const { maxRequests = 10, windowMs = 60_000 } = opts;
  const now = Date.now();

  const entry = store.get(userId);

  if (!entry || now > entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}
