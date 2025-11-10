import type { Provider } from "ethers";
import { ethers } from "ethers";
import { rateLimiter } from "./rateLimiter";
import { ARC_RPC_URL } from "./constants";

export interface BatchCall {
  to: string;
  data: string;
  decode?: (result: string) => any;
}

/**
 * Execute multiple RPC calls in a single batch request
 * Reduces HTTP overhead and helps avoid rate limits
 */
export async function batchRpcCall(
  provider: Provider,
  calls: BatchCall[]
): Promise<any[]> {
  if (calls.length === 0) return [];

  // Try to get RPC URL from provider or use default from constants
  let rpcUrl: string | null = null;
  
  try {
    // Try different ways to get RPC URL depending on provider type
    if ((provider as any).connection?.url) {
      rpcUrl = (provider as any).connection.url;
    } else if ((provider as any)._getConnection?.()?.url) {
      rpcUrl = (provider as any)._getConnection().url;
    } else if ((provider as any).provider?.connection?.url) {
      rpcUrl = (provider as any).provider.connection.url;
    } else if ((provider as any).provider?.rpcUrl) {
      rpcUrl = (provider as any).provider.rpcUrl;
    } else if ((provider as any)._network?.then) {
      // For async network, we can't easily get URL, use default
      rpcUrl = ARC_RPC_URL;
    }
    
    // Fallback to default RPC URL from constants (for MetaMask providers)
    if (!rpcUrl && ARC_RPC_URL) {
      rpcUrl = ARC_RPC_URL;
    }
  } catch (error) {
    // If extraction fails, use default RPC URL
    if (ARC_RPC_URL) {
      rpcUrl = ARC_RPC_URL;
    }
  }

  // If we still can't get RPC URL, fallback to sequential execution with rate limiter
  if (!rpcUrl) {
    console.warn("[batchRpcCall] No RPC URL found, falling back to sequential calls");
    return Promise.all(
      calls.map(call => 
        rateLimiter.execute(async () => {
          try {
            const result = await provider.call({
              to: call.to,
              data: call.data,
            });
            return call.decode ? call.decode(result) : result;
          } catch (error) {
            console.error(`[batchRpcCall] Call failed for ${call.to}:`, error);
            return null;
          }
        })
      )
    );
  }

  // Create batch JSON-RPC request
  // Store calls in a const to ensure it's captured in closure
  const callsArray = calls;
  const batch = callsArray.map((call, index) => ({
    jsonrpc: "2.0",
    id: index + 1,
    method: "eth_call",
    params: [
      {
        to: call.to,
        data: call.data,
      },
      "latest",
    ],
  }));

  // Execute batch with rate limiter
  return rateLimiter.execute(async () => {
    try {
      const response = await fetch(rpcUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.warn(`[batchRpcCall] Batch RPC failed (${response.status} ${response.statusText}): ${errorText}`);
        throw new Error(`Batch RPC request failed: ${response.status} ${response.statusText || errorText}`);
      }

      const results = await response.json();
      
      // Check if response is an array (batch response) or single error object
      if (!Array.isArray(results)) {
        console.warn("[batchRpcCall] RPC endpoint doesn't support batching, falling back to sequential");
        throw new Error("Batch not supported");
      }
      
      // Handle errors and decode results
      return results.map((result: any, index: number) => {
        if (result.error) {
          console.warn(`[batchRpcCall] Batch call ${index} failed:`, result.error.message || result.error);
          return null;
        }
        try {
          const call = callsArray[index];
          if (!call) {
            console.error(`[batchRpcCall] No call found at index ${index}`);
            return null;
          }
          return call.decode ? call.decode(result.result) : result.result;
        } catch (error) {
          console.error(`[batchRpcCall] Decode failed for call ${index}:`, error);
          return null;
        }
      });
    } catch (error) {
      console.warn("[batchRpcCall] Batch request failed, falling back to sequential calls:", error instanceof Error ? error.message : error);
      // Fallback to sequential
      return Promise.all(
        callsArray.map(call => 
          rateLimiter.execute(async () => {
            try {
              const result = await provider.call({
                to: call.to,
                data: call.data,
              });
              return call.decode ? call.decode(result) : result;
            } catch (error) {
              console.error(`[batchRpcCall] Fallback call failed for ${call.to}:`, error);
              return null;
            }
          })
        )
      );
    }
  });
}

/**
 * Batch fetch multiple token balances
 */
export async function batchFetchBalances(
  provider: Provider,
  tokenAddresses: string[],
  userAddress: string
): Promise<bigint[]> {
  if (tokenAddresses.length === 0) return [];

  const ERC20ABI = ["function balanceOf(address) view returns (uint256)"];
  const iface = new ethers.Interface(ERC20ABI);
  const balanceOfSelector = iface.getFunction("balanceOf")!.selector;

  const calls: BatchCall[] = tokenAddresses.map(tokenAddress => ({
    to: tokenAddress,
    data: balanceOfSelector + userAddress.slice(2).padStart(64, "0"),
    decode: (result: string) => {
      if (!result || result === "0x" || result === "0x0") return 0n;
      try {
        return BigInt(result);
      } catch {
        return 0n;
      }
    },
  }));

  const results = await batchRpcCall(provider, calls);
  return results.map((r: any) => (r !== null && r !== undefined ? BigInt(r) : 0n));
}

/**
 * Batch fetch multiple pair reserves
 */
export async function batchFetchReserves(
  provider: Provider,
  pairAddresses: string[]
): Promise<Array<[bigint, bigint] | null>> {
  if (pairAddresses.length === 0) return [];

  const PairABI = await import("./abis/Pair.json").then(m => m.default);
  const iface = new ethers.Interface(PairABI);
  const getReservesSelector = iface.getFunction("getReserves")!.selector;

  const calls: BatchCall[] = pairAddresses.map(pairAddress => ({
    to: pairAddress,
    data: getReservesSelector,
    decode: (result: string) => {
      if (!result || result === "0x" || result === "0x0") return null;
      try {
        const decoded = iface.decodeFunctionResult("getReserves", result);
        return [decoded[0], decoded[1]] as [bigint, bigint];
      } catch {
        return null;
      }
    },
  }));

  return batchRpcCall(provider, calls);
}

/**
 * Batch fetch token metadata (symbol, decimals, name)
 */
export async function batchFetchTokenInfo(
  provider: Provider,
  tokenAddresses: string[]
): Promise<Array<{ symbol: string; decimals: number; name: string } | null>> {
  if (tokenAddresses.length === 0) return [];

  const ERC20ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function name() view returns (string)",
  ];
  const iface = new ethers.Interface(ERC20ABI);
  const symbolSelector = iface.getFunction("symbol")!.selector;
  const decimalsSelector = iface.getFunction("decimals")!.selector;
  const nameSelector = iface.getFunction("name")!.selector;

  // Create calls for each token (3 calls per token: symbol, decimals, name)
  const calls: BatchCall[] = [];
  const tokenIndices: number[] = []; // Track which token each call belongs to

  tokenAddresses.forEach((tokenAddress, tokenIndex) => {
    // Symbol
    calls.push({
      to: tokenAddress,
      data: symbolSelector,
      decode: (result: string) => {
        try {
          if (!result || result === "0x") return null;
          const decoded = iface.decodeFunctionResult("symbol", result);
          return { type: "symbol", value: decoded[0], tokenIndex };
        } catch {
          return null;
        }
      },
    });
    tokenIndices.push(tokenIndex);

    // Decimals
    calls.push({
      to: tokenAddress,
      data: decimalsSelector,
      decode: (result: string) => {
        try {
          if (!result || result === "0x") return null;
          const decoded = iface.decodeFunctionResult("decimals", result);
          return { type: "decimals", value: Number(decoded[0]), tokenIndex };
        } catch {
          return null;
        }
      },
    });
    tokenIndices.push(tokenIndex);

    // Name
    calls.push({
      to: tokenAddress,
      data: nameSelector,
      decode: (result: string) => {
        try {
          if (!result || result === "0x") return null;
          const decoded = iface.decodeFunctionResult("name", result);
          return { type: "name", value: decoded[0], tokenIndex };
        } catch {
          return null;
        }
      },
    });
    tokenIndices.push(tokenIndex);
  });

  const results = await batchRpcCall(provider, calls);
  
  // Reconstruct token info from results
  const tokenInfo: Array<{ symbol: string; decimals: number; name: string } | null> = 
    new Array(tokenAddresses.length).fill(null).map(() => ({ symbol: "UNKNOWN", decimals: 18, name: "" }));

  results.forEach((result: any, index: number) => {
    if (!result || !result.type) return;
    const tokenIndex = result.tokenIndex;
    if (tokenIndex >= 0 && tokenIndex < tokenInfo.length) {
      if (tokenInfo[tokenIndex]) {
        (tokenInfo[tokenIndex] as any)[result.type] = result.value;
      }
    }
  });

  return tokenInfo;
}

