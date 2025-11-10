import { ethers } from "ethers";
import type { Provider, Signer } from "ethers";
import { ROUTER_ADDRESS, PAIR_USDC_EURC, PAIR_USDC_REARC, PAIR_EURC_REARC, REARC_ADDRESS, NYC1_ADDRESS, FACTORY_ADDRESS } from "./constants";
import PairABI from "./abis/Pair.json";
import RouterABI from "./abis/Router.json";
import FactoryABI from "./abis/Factory.json";
import { blockchainCache } from "./cache";
import { rateLimiter } from "./rateLimiter";

/**
 * Discover all token addresses from Factory pairs
 * Returns a map of token address -> { symbol, decimals, name }
 * Uses caching to reduce RPC calls
 */
export async function discoverTokensFromFactory(
  provider: Provider
): Promise<Map<string, { symbol: string; decimals: number; name?: string }>> {
  const cacheKey = blockchainCache.tokenDiscoveryKey();
  const cached = blockchainCache.get<Map<string, { symbol: string; decimals: number; name?: string }>>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  const tokenMap = new Map<string, { symbol: string; decimals: number; name?: string }>();
  
  if (!FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
    return tokenMap;
  }
  
  try {
    const ethersProvider = provider instanceof ethers.BrowserProvider 
      ? provider 
      : new ethers.BrowserProvider(provider as any);
    const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, ethersProvider);
    
    const pairsLength = await rateLimiter.execute(async () => {
      return await factoryContract.allPairsLength();
    });
    
    // Get all pair addresses with rate limiting
    const pairAddresses: string[] = [];
    for (let i = 0; i < pairsLength; i++) {
      try {
        const pairAddress = await rateLimiter.execute(async () => {
          return await factoryContract.allPairs(i);
        });
        if (pairAddress && pairAddress !== ethers.ZeroAddress) {
          pairAddresses.push(pairAddress);
        }
      } catch (error) {
        console.warn(`[discoverTokensFromFactory] Error getting pair ${i}:`, error);
        break; // Stop on error to avoid rate limiting
      }
    }
    
    // Get token addresses from each pair
    const ERC20ABI = [
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function name() view returns (string)",
    ];
    
    for (const pairAddress of pairAddresses) {
      try {
        const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
        const [token0, token1] = await Promise.all([
          pairContract.token0().catch(() => null),
          pairContract.token1().catch(() => null),
        ]);
        
        // Fetch token info for both tokens
        for (const tokenAddress of [token0, token1]) {
          if (!tokenAddress || tokenAddress === ethers.ZeroAddress) continue;
          const addrLower = tokenAddress.toLowerCase();
          if (tokenMap.has(addrLower)) continue; // Already discovered
          
          // Check cache for individual token info
          const tokenInfoKey = blockchainCache.tokenInfoKey(tokenAddress);
          const cachedTokenInfo = blockchainCache.get<{ symbol: string; decimals: number; name?: string }>(tokenInfoKey);
          if (cachedTokenInfo) {
            tokenMap.set(addrLower, cachedTokenInfo);
            continue;
          }
          
          try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, ethersProvider);
            const [symbol, decimals, name] = await Promise.all([
              tokenContract.symbol().catch(() => "UNKNOWN"),
              tokenContract.decimals().catch(() => 18),
              tokenContract.name().catch(() => ""),
            ]);
            
            const tokenInfo = {
              symbol: symbol || "UNKNOWN",
              decimals: decimals || 18,
              name: name || "",
            };
            
            tokenMap.set(addrLower, tokenInfo);
            // Cache individual token info
            blockchainCache.setWithTTL(tokenInfoKey, tokenInfo, 'TOKEN_INFO');
          } catch (error) {
            console.warn(`[discoverTokensFromFactory] Error fetching info for token ${tokenAddress}:`, error);
            // Still add it with defaults
            const defaultInfo = { symbol: "UNKNOWN", decimals: 18 };
            tokenMap.set(addrLower, defaultInfo);
            blockchainCache.setWithTTL(tokenInfoKey, defaultInfo, 'TOKEN_INFO');
          }
        }
      } catch (error) {
        console.warn(`[discoverTokensFromFactory] Error processing pair ${pairAddress}:`, error);
      }
    }
    
    // Cache the entire discovery result
    blockchainCache.setWithTTL(cacheKey, tokenMap, 'TOKEN_DISCOVERY');
  } catch (error) {
    console.error("[discoverTokensFromFactory] Error discovering tokens:", error);
  }
  
  return tokenMap;
}

/**
 * Get reserves from a specific pair contract
 */
export async function getPairReserves(
  provider: Provider,
  pairAddress: string
): Promise<[bigint, bigint]> {
  if (!pairAddress || pairAddress === "" || !ethers.isAddress(pairAddress)) {
    throw new Error("Pair address not configured");
  }
  // Convert provider to BrowserProvider if needed
  const ethersProvider = provider instanceof ethers.BrowserProvider 
    ? provider 
    : new ethers.BrowserProvider(provider as any);
  const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
  const [reserve0, reserve1] = await pairContract.getReserves();
  return [reserve0, reserve1];
}

/**
 * Calculate required amount of tokenB for adding liquidity
 * Based on current reserves ratio
 */
export function calculateRequiredAmount(
  amountA: bigint,
  reserveA: bigint,
  reserveB: bigint
): bigint {
  if (reserveA === 0n || reserveB === 0n) {
    // If pool is empty, return same amount (1:1 ratio for new pools)
    return amountA;
  }
  // Maintain the same ratio as reserves
  return (amountA * reserveB) / reserveA;
}

/**
 * Get estimated liquidity tokens to be minted
 */
export async function getEstimatedLiquidity(
  provider: Provider,
  pairAddress: string,
  amountA: bigint,
  amountB: bigint
): Promise<bigint> {
  if (!pairAddress || !ethers.isAddress(pairAddress)) {
    throw new Error("Pair address not configured");
  }
  // Convert provider to BrowserProvider if needed
  const ethersProvider = provider instanceof ethers.BrowserProvider 
    ? provider 
    : new ethers.BrowserProvider(provider as any);
  const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
  const [reserve0, reserve1] = await pairContract.getReserves();
  const totalSupply = await pairContract.totalSupply();
  
  if (totalSupply === 0n) {
    // New pool: liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
    const MINIMUM_LIQUIDITY = 1000n;
    const product = amountA * amountB;
    const sqrtResult = sqrtBigInt(product);
    return sqrtResult > MINIMUM_LIQUIDITY ? sqrtResult - MINIMUM_LIQUIDITY : 0n;
  } else {
    // Existing pool: liquidity = min(amount0 * totalSupply / reserve0, amount1 * totalSupply / reserve1)
    const liquidity0 = (amountA * totalSupply) / reserve0;
    const liquidity1 = (amountB * totalSupply) / reserve1;
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }
}

/**
 * Simple sqrt function for BigInt using Newton's method
 */
function sqrtBigInt(value: bigint): bigint {
  if (value < 0n) return 0n;
  if (value < 2n) return value;
  
  let x = value;
  let y = (value + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }
  return x;
}

/**
 * Add liquidity to a pool
 */
export async function addLiquidity(
  signer: Signer,
  tokenA: string,
  tokenB: string,
  amountADesired: bigint,
  amountBDesired: bigint,
  amountAMin: bigint,
  amountBMin: bigint,
  to: string,
  deadline: number = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes
): Promise<ethers.ContractTransactionResponse> {
  if (!ROUTER_ADDRESS || !ethers.isAddress(ROUTER_ADDRESS)) {
    throw new Error("Router address not configured");
  }
  if (!tokenA || !tokenB || !ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
    throw new Error("Invalid token addresses");
  }
  if (!to || !ethers.isAddress(to)) {
    throw new Error("Invalid recipient address");
  }
  const routerContract = new ethers.Contract(ROUTER_ADDRESS, RouterABI, signer);
  return await routerContract.addLiquidity(
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
    to,
    deadline
  );
}

/**
 * Remove liquidity from a pool
 */
export async function removeLiquidity(
  signer: Signer,
  tokenA: string,
  tokenB: string,
  liquidity: bigint,
  amountAMin: bigint,
  amountBMin: bigint,
  to: string,
  deadline: number = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes
): Promise<ethers.ContractTransactionResponse> {
  if (!ROUTER_ADDRESS || !ethers.isAddress(ROUTER_ADDRESS)) {
    throw new Error("Router address not configured");
  }
  if (!tokenA || !tokenB || !ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
    throw new Error("Invalid token addresses");
  }
  if (!to || !ethers.isAddress(to)) {
    throw new Error("Invalid recipient address");
  }
  const routerContract = new ethers.Contract(ROUTER_ADDRESS, RouterABI, signer);
  return await routerContract.removeLiquidity(
    tokenA,
    tokenB,
    liquidity,
    amountAMin,
    amountBMin,
    to,
    deadline
  );
}

/**
 * Calculate estimated token amounts when removing liquidity
 */
export async function getEstimatedRemoveAmounts(
  provider: Provider,
  pairAddress: string,
  liquidity: bigint
): Promise<[bigint, bigint]> {
  if (!pairAddress || !ethers.isAddress(pairAddress)) {
    throw new Error("Pair address not configured");
  }
  // Convert provider to BrowserProvider if needed
  const ethersProvider = provider instanceof ethers.BrowserProvider 
    ? provider 
    : new ethers.BrowserProvider(provider as any);
  const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
  
  const [reserve0, reserve1] = await pairContract.getReserves();
  const totalSupply = await pairContract.totalSupply();
  
  if (totalSupply === 0n) {
    return [0n, 0n];
  }
  
  // Calculate proportional amounts
  const amount0 = (liquidity * reserve0) / totalSupply;
  const amount1 = (liquidity * reserve1) / totalSupply;
  
  return [amount0, amount1];
}

/**
 * Get pair address for two tokens
 * First checks hardcoded pairs, then queries Factory if available
 * Uses caching to reduce RPC calls
 */
export async function getPairAddress(tokenA: string, tokenB: string, provider?: Provider): Promise<string> {
  // Validate input addresses
  if (!tokenA || !tokenB || !ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
    return "";
  }
  
  // Check cache first
  const cacheKey = blockchainCache.pairAddressKey(tokenA, tokenB);
  const cached = blockchainCache.get<string>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  const USDC = "0x3600000000000000000000000000000000000000";
  const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
  
  // Normalize addresses (handle both orders)
  const addr1 = tokenA.toLowerCase();
  const addr2 = tokenB.toLowerCase();
  const usdc = USDC.toLowerCase();
  const eurc = EURC.toLowerCase();
  const rearc = REARC_ADDRESS ? REARC_ADDRESS.toLowerCase() : "";
  const nyc1 = NYC1_ADDRESS ? NYC1_ADDRESS.toLowerCase() : "";
  
  // Check hardcoded pairs first (for known pairs)
  if ((addr1 === usdc && addr2 === eurc) || (addr1 === eurc && addr2 === usdc)) {
    const result = PAIR_USDC_EURC || "";
    blockchainCache.setWithTTL(cacheKey, result, 'PAIR_ADDRESS');
    return result;
  }
  // Check if one is USDC and the other is REARC
  if (rearc && ((addr1 === usdc && addr2 === rearc) || (addr1 === rearc && addr2 === usdc))) {
    const result = PAIR_USDC_REARC || "";
    blockchainCache.setWithTTL(cacheKey, result, 'PAIR_ADDRESS');
    return result;
  }
  // Check if one is EURC and the other is REARC
  if (rearc && ((addr1 === eurc && addr2 === rearc) || (addr1 === rearc && addr2 === eurc))) {
    const result = PAIR_EURC_REARC || "";
    blockchainCache.setWithTTL(cacheKey, result, 'PAIR_ADDRESS');
    return result;
  }
  
  // If not a hardcoded pair and we have Factory address and provider, query Factory
  if (FACTORY_ADDRESS && ethers.isAddress(FACTORY_ADDRESS) && provider) {
    try {
      const ethersProvider = provider instanceof ethers.BrowserProvider 
        ? provider 
        : new ethers.BrowserProvider(provider as any);
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, ethersProvider);
      
      // Factory stores pairs with tokens in sorted order (token0 < token1)
      // Compare addresses as strings (lowercase for comparison, but use original addresses)
      const sortedToken0 = tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenA : tokenB;
      const sortedToken1 = tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenB : tokenA;
      
      // Try sorted order first (this is how Factory stores it)
      let pairAddress = await rateLimiter.execute(async () => {
        return await factoryContract.getPair(sortedToken0, sortedToken1);
      });
      if (pairAddress && pairAddress !== ethers.ZeroAddress) {
        blockchainCache.setWithTTL(cacheKey, pairAddress, 'PAIR_ADDRESS');
        return pairAddress;
      }
      
      // Try reverse order (Factory also stores this, but just in case)
      pairAddress = await rateLimiter.execute(async () => {
        return await factoryContract.getPair(sortedToken1, sortedToken0);
      });
      if (pairAddress && pairAddress !== ethers.ZeroAddress) {
        blockchainCache.setWithTTL(cacheKey, pairAddress, 'PAIR_ADDRESS');
        return pairAddress;
      }
      
      // Cache empty result to avoid repeated queries
      blockchainCache.setWithTTL(cacheKey, "", 'PAIR_ADDRESS');
    } catch (error) {
      console.error("Error querying Factory for pair address:", error);
      // Cache empty result on error to prevent repeated failed queries
      blockchainCache.setWithTTL(cacheKey, "", 'PAIR_ADDRESS');
    }
  } else {
    // Cache empty result
    blockchainCache.setWithTTL(cacheKey, "", 'PAIR_ADDRESS');
  }
  
  return "";
}

/**
 * Find a swap path between two tokens (direct or multi-hop)
 * Returns an array of token addresses representing the swap path
 * Uses caching to reduce RPC calls
 */
export async function findSwapPath(
  tokenA: string,
  tokenB: string,
  provider?: Provider
): Promise<string[]> {
  // Validate input addresses
  if (!tokenA || !tokenB || !ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
    return [];
  }
  
  // If tokens are the same, return empty path
  if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
    return [];
  }
  
  // Check cache first
  const cacheKey = blockchainCache.swapPathKey(tokenA, tokenB);
  const cached = blockchainCache.get<string[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Try direct pair first
  const directPair = await getPairAddress(tokenA, tokenB, provider);
  if (directPair && directPair !== "" && ethers.isAddress(directPair)) {
    const path = [tokenA, tokenB];
    blockchainCache.setWithTTL(cacheKey, path, 'SWAP_PATH');
    return path;
  }
  
  // If no direct pair and we have Factory, try to find a path through common tokens
  if (!FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS) || !provider) {
    blockchainCache.setWithTTL(cacheKey, [], 'SWAP_PATH');
    return [];
  }
  
  const USDC = "0x3600000000000000000000000000000000000000";
  const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
  const commonTokens = [USDC, EURC];
  
  // Add REARC and NYC1 if they're configured
  if (REARC_ADDRESS && ethers.isAddress(REARC_ADDRESS)) {
    commonTokens.push(REARC_ADDRESS);
  }
  if (NYC1_ADDRESS && ethers.isAddress(NYC1_ADDRESS)) {
    commonTokens.push(NYC1_ADDRESS);
  }
  
  // Try paths through common tokens (2-hop)
  for (const intermediateToken of commonTokens) {
    // Skip if intermediate is one of the endpoints
    if (intermediateToken.toLowerCase() === tokenA.toLowerCase() || 
        intermediateToken.toLowerCase() === tokenB.toLowerCase()) {
      continue;
    }
    
    // Check if we can go tokenA -> intermediate -> tokenB
    const pair1 = await getPairAddress(tokenA, intermediateToken, provider);
    const pair2 = await getPairAddress(intermediateToken, tokenB, provider);
    
    if (pair1 && pair1 !== "" && ethers.isAddress(pair1) &&
        pair2 && pair2 !== "" && ethers.isAddress(pair2)) {
      const path = [tokenA, intermediateToken, tokenB];
      blockchainCache.setWithTTL(cacheKey, path, 'SWAP_PATH');
      return path;
    }
  }
  
  // No path found - cache empty result
  blockchainCache.setWithTTL(cacheKey, [], 'SWAP_PATH');
  return [];
}

/**
 * Calculate implied exchange rate for EURC/REARC from USDC/EURC and USDC/REARC pools
 * Returns: amount of REARC per 1 EURC (in wei, accounting for decimals)
 */
export async function calculateImpliedRate(
  provider: Provider,
  eurcDecimals: number,
  rearcDecimals: number
): Promise<bigint | null> {
  if (!PAIR_USDC_EURC || !PAIR_USDC_REARC || 
      !ethers.isAddress(PAIR_USDC_EURC) || !ethers.isAddress(PAIR_USDC_REARC)) {
    return null;
  }
  
  try {
    const ethersProvider = provider instanceof ethers.BrowserProvider 
      ? provider 
      : new ethers.BrowserProvider(provider as any);
    
    // Get USDC/EURC reserves
    const usdcEurcContract = new ethers.Contract(PAIR_USDC_EURC, PairABI, ethersProvider);
    const [usdcEurcRes0, usdcEurcRes1] = await usdcEurcContract.getReserves();
    
    // Get USDC/REARC reserves
    const usdcRearcContract = new ethers.Contract(PAIR_USDC_REARC, PairABI, ethersProvider);
    const [usdcRearcRes0, usdcRearcRes1] = await usdcRearcContract.getReserves();
    
    // Determine token order (token0 is always the lower address)
    const USDC = "0x3600000000000000000000000000000000000000";
    const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
    const REARC = REARC_ADDRESS;
    
    // USDC/EURC: USDC is token0 (lower address)
    const usdcEurcReserve = USDC < EURC ? usdcEurcRes0 : usdcEurcRes1;
    const eurcReserve = USDC < EURC ? usdcEurcRes1 : usdcEurcRes0;
    
    // USDC/REARC: USDC is token0
    const usdcRearcReserve = USDC < REARC ? usdcRearcRes0 : usdcRearcRes1;
    const rearcReserve = USDC < REARC ? usdcRearcRes1 : usdcRearcRes0;
    
    if (usdcEurcReserve === 0n || eurcReserve === 0n || usdcRearcReserve === 0n || rearcReserve === 0n) {
      return null;
    }
    
    // Calculate: 1 EURC = (1 USDC / EURC price) * (REARC / 1 USDC price)
    // 1 EURC = (usdcEurcReserve / eurcReserve) * (rearcReserve / usdcRearcReserve) REARC
    
    // Adjust for decimals: all calculations in wei
    // 1 EURC (in wei) = (usdcEurcReserve * rearcReserve * 10^rearcDecimals) / (eurcReserve * usdcRearcReserve * 10^eurcDecimals)
    // But we want: 1 EURC = X REARC, so we need to account for decimals
    
    // Simplified: price of EURC in USDC = usdcEurcReserve / eurcReserve (adjusted for decimals)
    // price of REARC in USDC = usdcRearcReserve / rearcReserve (adjusted for decimals)
    // So: 1 EURC = (usdcEurcReserve / eurcReserve) / (usdcRearcReserve / rearcReserve) REARC
    // = (usdcEurcReserve * rearcReserve) / (eurcReserve * usdcRearcReserve) REARC
    
    // But we need to account for decimals:
    // If USDC has 6 decimals, EURC has 6 decimals, REARC has 18 decimals:
    // 1 EURC = 1 * 10^6 (in wei)
    // We want: X REARC = X * 10^18 (in wei)
    // So: X = (usdcEurcReserve * rearcReserve * 10^6) / (eurcReserve * usdcRearcReserve * 10^18)
    // = (usdcEurcReserve * rearcReserve) / (eurcReserve * usdcRearcReserve * 10^12)
    
    // Actually, let's think in terms of the actual prices:
    // Price of EURC in USDC = eurcReserve / usdcEurcReserve (if both have same decimals)
    // Price of REARC in USDC = rearcReserve / usdcRearcReserve (accounting for decimals)
    
    // More accurate: 
    // 1 USDC = eurcReserve / usdcEurcReserve EURC (if same decimals)
    // 1 USDC = rearcReserve / usdcRearcReserve REARC (accounting for decimals)
    // So: 1 EURC = (usdcEurcReserve / eurcReserve) USDC
    // And: 1 USDC = (rearcReserve / usdcRearcReserve) REARC
    // Therefore: 1 EURC = (usdcEurcReserve / eurcReserve) * (rearcReserve / usdcRearcReserve) REARC
    
    // Accounting for decimals:
    // usdcEurcReserve and eurcReserve are in their native decimals (6)
    // usdcRearcReserve is in USDC decimals (6), rearcReserve is in REARC decimals (18)
    
    // So: 1 EURC (1e6) = (usdcEurcReserve / eurcReserve) * (rearcReserve / usdcRearcReserve) REARC
    // In wei: 1e6 EURC = (usdcEurcReserve * rearcReserve) / (eurcReserve * usdcRearcReserve) REARC (in wei)
    // But rearcReserve is already in 18 decimals, so:
    // 1e6 EURC = (usdcEurcReserve * rearcReserve) / (eurcReserve * usdcRearcReserve) REARC (in 18 decimals)
    // To get REARC per 1 EURC: multiply by 1e6 and divide by 1e6:
    // 1 EURC = (usdcEurcReserve * rearcReserve * 1e6) / (eurcReserve * usdcRearcReserve * 1e6) REARC
    // = (usdcEurcReserve * rearcReserve) / (eurcReserve * usdcRearcReserve) REARC
    
    // Actually simpler: work with the ratio directly
    // If both USDC and EURC have 6 decimals, the ratio is straightforward
    // usdcEurcReserve / eurcReserve gives us USDC per EURC (in native units)
    // rearcReserve / usdcRearcReserve gives us REARC per USDC (but need to account for decimals)
    
    // Let's use a simpler approach: calculate the implied price
    const usdcPerEurc = (usdcEurcReserve * BigInt(10 ** eurcDecimals)) / eurcReserve; // USDC per EURC (in USDC decimals)
    const rearcPerUsdc = (rearcReserve * BigInt(10 ** 6)) / usdcRearcReserve; // REARC per USDC (in REARC decimals, but USDC is 6 decimals)
    
    // Now: 1 EURC = usdcPerEurc USDC = usdcPerEurc * rearcPerUsdc REARC
    // But we need to adjust: usdcPerEurc is in 6 decimals, rearcPerUsdc is in 18 decimals
    // So: 1 EURC (1e6) = (usdcPerEurc * rearcPerUsdc) / 1e6 REARC (in 18 decimals)
    const impliedRearcPerEurc = (usdcPerEurc * rearcPerUsdc) / BigInt(10 ** 6);
    
    return impliedRearcPerEurc;
  } catch (error) {
    console.error("Error calculating implied rate:", error);
    return null;
  }
}

