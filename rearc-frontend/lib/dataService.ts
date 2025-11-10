import type { Provider } from "ethers";
import { ethers } from "ethers";
import { blockchainCache } from "./cache";
import { rateLimiter } from "./rateLimiter";
import { batchFetchBalances, batchFetchReserves, batchFetchTokenInfo } from "./rpc-batch";

type Subscriber = () => void;

class DataService {
  private subscribers = new Map<string, Set<Subscriber>>();
  private pendingFetches = new Map<string, Promise<any>>();

  /**
   * Subscribe to data updates
   * Returns unsubscribe function
   */
  subscribe(key: string, callback: Subscriber): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Notify all subscribers of a key
   */
  private notify(key: string): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error(`[DataService] Subscriber error for ${key}:`, error);
        }
      });
    }
  }

  /**
   * Get data with caching and optional fetcher
   * Deduplicates concurrent requests for the same key
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlType: keyof typeof blockchainCache["TTL"]
  ): Promise<T> {
    // Check cache first
    const cached = blockchainCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if already fetching (dedupe concurrent requests)
    const pending = this.pendingFetches.get(key);
    if (pending) {
      return pending;
    }

    // Fetch and cache
    const fetchPromise = rateLimiter.execute(async () => {
      try {
        const data = await fetcher();
        blockchainCache.setWithTTL(key, data, ttlType);
        this.notify(key);
        return data;
      } finally {
        this.pendingFetches.delete(key);
      }
    });

    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Invalidate cache and notify subscribers
   */
  invalidate(key: string): void {
    blockchainCache.invalidate(key);
    this.notify(key);
  }

  /**
   * Invalidate pattern and notify relevant subscribers
   */
  invalidatePattern(pattern: string | RegExp): void {
    blockchainCache.invalidatePattern(pattern);
    
    // Notify all subscribers whose keys match the pattern
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    for (const key of this.subscribers.keys()) {
      if (regex.test(key)) {
        this.notify(key);
      }
    }
  }

  /**
   * Batch fetch balances for multiple tokens
   * Uses batching to reduce RPC calls
   */
  async getBalances(
    provider: Provider,
    tokenAddresses: string[],
    userAddress: string
  ): Promise<Map<string, bigint>> {
    if (tokenAddresses.length === 0) return new Map();

    // Check cache for all balances first
    const balances = new Map<string, bigint>();
    const uncachedAddresses: string[] = [];

    for (const address of tokenAddresses) {
      const key = blockchainCache.balanceKey(address, userAddress);
      const cached = blockchainCache.get<bigint>(key);
      if (cached !== null) {
        balances.set(address, cached);
      } else {
        uncachedAddresses.push(address);
      }
    }

    // Batch fetch uncached balances
    if (uncachedAddresses.length > 0) {
      const fetchedBalances = await batchFetchBalances(provider, uncachedAddresses, userAddress);
      
      uncachedAddresses.forEach((address, index) => {
        const balance = fetchedBalances[index];
        const key = blockchainCache.balanceKey(address, userAddress);
        blockchainCache.setWithTTL(key, balance, "BALANCE");
        balances.set(address, balance);
      });

      // Don't notify here - components manage their own refresh cycles
    }

    return balances;
  }

  /**
   * Batch fetch reserves for multiple pairs
   * Uses batching to reduce RPC calls
   */
  async getReserves(
    provider: Provider,
    pairAddresses: string[]
  ): Promise<Map<string, [bigint, bigint]>> {
    if (pairAddresses.length === 0) return new Map();

    // Check cache for all reserves first
    const reserves = new Map<string, [bigint, bigint]>();
    const uncachedAddresses: string[] = [];

    for (const address of pairAddresses) {
      const key = blockchainCache.reservesKey(address);
      const cached = blockchainCache.get<[bigint, bigint]>(key);
      if (cached !== null) {
        reserves.set(address, cached);
      } else {
        uncachedAddresses.push(address);
      }
    }

    // Batch fetch uncached reserves
    if (uncachedAddresses.length > 0) {
      const fetchedReserves = await batchFetchReserves(provider, uncachedAddresses);
      
      uncachedAddresses.forEach((address, index) => {
        const reserve = fetchedReserves[index];
        if (reserve) {
          const key = blockchainCache.reservesKey(address);
          blockchainCache.setWithTTL(key, reserve, "RESERVES");
          reserves.set(address, reserve);
        }
      });

      // Don't notify here - components manage their own refresh cycles
    }

    return reserves;
  }

  /**
   * Batch fetch token info for multiple tokens
   */
  async getTokenInfo(
    provider: Provider,
    tokenAddresses: string[]
  ): Promise<Map<string, { symbol: string; decimals: number; name: string }>> {
    if (tokenAddresses.length === 0) return new Map();

    // Check cache for all token info first
    const tokenInfo = new Map<string, { symbol: string; decimals: number; name: string }>();
    const uncachedAddresses: string[] = [];

    for (const address of tokenAddresses) {
      const key = blockchainCache.tokenInfoKey(address);
      const cached = blockchainCache.get<{ symbol: string; decimals: number; name: string }>(key);
      if (cached !== null) {
        tokenInfo.set(address, cached);
      } else {
        uncachedAddresses.push(address);
      }
    }

    // Batch fetch uncached token info
    if (uncachedAddresses.length > 0) {
      const fetchedInfo = await batchFetchTokenInfo(provider, uncachedAddresses);
      
      uncachedAddresses.forEach((address, index) => {
        const info = fetchedInfo[index];
        if (info) {
          const key = blockchainCache.tokenInfoKey(address);
          blockchainCache.setWithTTL(key, info, "TOKEN_INFO");
          tokenInfo.set(address, info);
        }
      });

      // Notify token info subscribers
      this.invalidatePattern(/^token:/);
    }

    return tokenInfo;
  }

  /**
   * Force refresh data (bypass cache)
   */
  async refresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlType: keyof typeof blockchainCache["TTL"]
  ): Promise<T> {
    // Invalidate cache first
    this.invalidate(key);
    
    // Fetch fresh data
    return this.get(key, fetcher, ttlType);
  }
}

// Singleton instance
export const dataService = new DataService();

