/**
 * Blockchain Data Cache
 * 
 * Implements caching for blockchain data to reduce RPC calls and prevent rate limiting.
 * Different data types have different TTLs based on how frequently they change.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class BlockchainCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  // TTLs in milliseconds - optimized to reduce RPC calls while maintaining freshness
  private readonly TTL = {
    PAIR_ADDRESS: 60 * 60 * 1000,        // 1 hour - pair addresses don't change
    TOKEN_INFO: 60 * 60 * 1000,          // 1 hour - token info doesn't change
    RESERVES: 60 * 1000,                 // 60 seconds - reserves change frequently but cache longer
    BALANCE: 30 * 1000,                   // 30 seconds - balances change frequently
    EXCHANGE_RATE: 60 * 1000,            // 60 seconds - exchange rates change frequently
    SWAP_PATH: 30 * 60 * 1000,           // 30 minutes - swap paths don't change often
    FACTORY_PAIRS: 30 * 60 * 1000,      // 30 minutes - pairs list changes rarely
    TOKEN_DISCOVERY: 60 * 60 * 1000,     // 1 hour - token discovery doesn't change
    SWAP_HISTORY: 120 * 1000,            // 2 minutes - swap history updates periodically
  };

  /**
   * Get cached data if it exists and is still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cached data with a TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.TTL.RESERVES,
    };
    this.cache.set(key, entry);
  }

  /**
   * Set cached data with a specific TTL type
   */
  setWithTTL<T>(key: string, data: T, ttlType: keyof typeof this.TTL): void {
    this.set(key, data, this.TTL[ttlType]);
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    
    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }

  // Helper methods for common cache keys
  pairAddressKey(tokenA: string, tokenB: string): string {
    const sorted = [tokenA.toLowerCase(), tokenB.toLowerCase()].sort().join('-');
    return `pair:${sorted}`;
  }

  tokenInfoKey(address: string): string {
    return `token:${address.toLowerCase()}`;
  }

  reservesKey(pairAddress: string): string {
    return `reserves:${pairAddress.toLowerCase()}`;
  }

  balanceKey(tokenAddress: string, userAddress: string): string {
    return `balance:${tokenAddress.toLowerCase()}:${userAddress.toLowerCase()}`;
  }

  swapPathKey(tokenA: string, tokenB: string): string {
    const sorted = [tokenA.toLowerCase(), tokenB.toLowerCase()].sort().join('-');
    return `path:${sorted}`;
  }

  factoryPairsKey(): string {
    return 'factory:pairs';
  }

  tokenDiscoveryKey(): string {
    return 'tokens:discovered';
  }
}

// Singleton instance
export const blockchainCache = new BlockchainCache();

// Cleanup expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const stats = blockchainCache.getStats();
    if (stats.expired > 0) {
      // Cleanup expired entries
      const now = Date.now();
      const cache = (blockchainCache as any).cache as Map<string, CacheEntry<any>>;
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          cache.delete(key);
        }
      }
    }
  }, 60000); // Cleanup every minute
}

