interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly MAX_REQUESTS = 3;
  private readonly WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor() {
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if an IP has remaining rate limit capacity
   * @param ip The IP address to check
   * @returns Object with allowed status, remaining count, and reset time
   */
  checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: Date } {
    const now = Date.now();
    const entry = this.store.get(ip);

    // No entry yet, allow the request
    if (!entry) {
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS - 1,
        resetAt: new Date(now + this.WINDOW_MS),
      };
    }

    // Check if the window has expired
    if (now > entry.resetTime) {
      // Window expired, reset and allow
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS - 1,
        resetAt: new Date(now + this.WINDOW_MS),
      };
    }

    // Window still active, check count
    const remaining = this.MAX_REQUESTS - entry.count;
    const allowed = remaining > 0;

    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetAt: new Date(entry.resetTime),
    };
  }

  /**
   * Record usage for an IP address
   * @param ip The IP address to record
   * @param isPaid Whether this is a paid analysis (won't count toward rate limit)
   */
  recordUsage(ip: string, isPaid: boolean = false): void {
    // Don't count paid analyses
    if (isPaid) {
      return;
    }

    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry) {
      // Create new entry
      this.store.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
    } else if (now > entry.resetTime) {
      // Window expired, reset
      this.store.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
    } else {
      // Window still active, increment
      entry.count += 1;
    }
  }

  /**
   * Start the cleanup interval to remove expired entries
   * This prevents memory leaks from accumulating stale entries
   */
  private startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Remove expired entries from the store
   */
  private cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    this.store.forEach((entry, ip) => {
      if (now > entry.resetTime) {
        entriesToDelete.push(ip);
      }
    });

    for (const ip of entriesToDelete) {
      this.store.delete(ip);
    }
  }

  /**
   * Get the current number of stored entries (for debugging/monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

export const rateLimiter = new RateLimiter();
