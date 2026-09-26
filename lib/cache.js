/**
 * Simple in-memory cache with TTL (Time to Live)
 */
class MemoryCache {
  constructor(defaultTtlMs = 15 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlMs) {
    const expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
    // Cleanup if map gets too large (keep max 200 items in memory)
    if (this.cache.size > 200) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  del(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

const trendingCache = new MemoryCache(15 * 60 * 1000); // 15 mins
const detailCache = new MemoryCache(60 * 60 * 1000);   // 60 mins
const homeCache = new MemoryCache(15 * 60 * 1000);     // 15 mins
const searchCache = new MemoryCache(15 * 60 * 1000);   // 15 mins

module.exports = {
  MemoryCache,
  trendingCache,
  detailCache,
  homeCache,
  searchCache,
};

