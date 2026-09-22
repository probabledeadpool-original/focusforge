interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class IntelligenceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();

  public get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const now = Date.now();
    const isStale = now > entry.expiresAt;
    return { data: entry.data as T, isStale };
  }

  public set<T>(key: string, data: T, ttlSeconds: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000
    });
  }

  public async fetchWithDedupe<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    // Check if duplicate request is in flight
    if (this.inFlight.has(key)) {
      try {
        return await this.inFlight.get(key)!;
      } catch (e) {
        if (cached) return cached.data;
        throw e;
      }
    }

    const promise = fetcher()
      .then((data) => {
        this.set(key, data, ttlSeconds);
        this.inFlight.delete(key);
        return data;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        if (cached) {
          // Serve stale data on network failure
          return cached.data;
        }
        throw err;
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  public clear(keyPrefix?: string): void {
    if (!keyPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const intelligenceCache = new IntelligenceCache();
