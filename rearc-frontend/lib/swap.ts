import { ethers } from "ethers";
import type { Provider, Signer } from "ethers";
import { ROUTER_ADDRESS, USDC_ADDRESS, EURC_ADDRESS, REARC_ADDRESS, USDC_DECIMALS, EURC_DECIMALS, REARC_DECIMALS } from "./constants";
import { getPairAddress } from "./liquidity";
import PairABI from "./abis/Pair.json";
import RouterABI from "./abis/Router.json";
import { blockchainCache } from "./cache";
import { rateLimiter } from "./rateLimiter";

/**
 * Get reserves from a specific pair contract
 * Uses caching to reduce RPC calls
 */
export async function getReserves(provider: Provider, pairAddress: string): Promise<[bigint, bigint]> {
  if (!pairAddress || pairAddress === "" || !ethers.isAddress(pairAddress)) {
    throw new Error("Pair address not configured");
  }
  
  // Check cache first
  const cacheKey = blockchainCache.reservesKey(pairAddress);
  const cached = blockchainCache.get<[bigint, bigint]>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Convert provider to BrowserProvider if needed
  const ethersProvider = provider instanceof ethers.BrowserProvider 
    ? provider 
    : new ethers.BrowserProvider(provider as any);
  const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
  
  // Use rate limiter to prevent rate limiting
  const [reserve0, reserve1] = await rateLimiter.execute(async () => {
    return await pairContract.getReserves();
  });
  
  // Cache the result
  blockchainCache.setWithTTL(cacheKey, [reserve0, reserve1], 'RESERVES');
  return [reserve0, reserve1];
}

/**
 * Calculate swap output using AMM formula with 0.3% fee
 */
export function calculateSwapOutput(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (reserveIn === 0n || reserveOut === 0n) {
    return 0n;
  }
  const amountInWithFee = (amountIn * 997n) / 1000n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

/**
 * Check if router has approval to spend tokens
 * Uses caching to reduce RPC calls
 */
export async function checkAllowance(
  provider: Provider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error("Invalid token address");
  }
  
  // Check cache first (allowance changes when user approves, so shorter TTL)
  const cacheKey = `allowance:${tokenAddress.toLowerCase()}:${owner.toLowerCase()}:${spender.toLowerCase()}`;
  const cached = blockchainCache.get<bigint>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  const erc20ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
  ];
  // Convert provider to BrowserProvider if needed
  const ethersProvider = provider instanceof ethers.BrowserProvider 
    ? provider 
    : new ethers.BrowserProvider(provider as any);
  const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, ethersProvider);
  const allowance = await tokenContract.allowance(owner, spender);
  
  // Cache with shorter TTL since allowance can change
  blockchainCache.set(cacheKey, allowance, 5 * 1000); // 5 seconds
  return allowance;
}

/**
 * Approve router to spend tokens
 */
export async function approveToken(
  signer: Signer,
  tokenAddress: string,
  spender: string,
  amount: bigint = ethers.MaxUint256
): Promise<ethers.ContractTransactionResponse> {
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error("Invalid token address");
  }
  if (!spender || !ethers.isAddress(spender)) {
    throw new Error("Invalid spender address");
  }
  const erc20ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
  ];
  const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);
  return await tokenContract.approve(spender, amount);
}

/**
 * Execute a swap
 */
export async function executeSwap(
  signer: Signer,
  amountIn: bigint,
  minAmountOut: bigint,
  path: string[],
  to: string,
  deadline: number = Math.floor(Date.now() / 1000) + 60
): Promise<ethers.ContractTransactionResponse> {
  if (!ROUTER_ADDRESS || !ethers.isAddress(ROUTER_ADDRESS)) {
    throw new Error("Router address not configured");
  }
  const routerContract = new ethers.Contract(ROUTER_ADDRESS, RouterABI, signer);
  return await routerContract.swapExactTokensForTokens(
    amountIn,
    minAmountOut,
    path,
    to,
    deadline
  );
}

/**
 * Get estimated output for a swap
 */
export async function getEstimatedOutput(
  provider: Provider,
  amountIn: bigint,
  path: string[]
): Promise<bigint> {
  if (!ROUTER_ADDRESS || !ethers.isAddress(ROUTER_ADDRESS)) {
    throw new Error("Router address not configured");
  }
  if (amountIn === 0n || amountIn < 0n) {
    throw new Error("Amount must be greater than zero");
  }
  if (!path || path.length < 2) {
    throw new Error("Invalid swap path");
  }
  // Validate all addresses in path
  for (const addr of path) {
    if (!addr || !ethers.isAddress(addr)) {
      throw new Error("Invalid address in swap path");
    }
  }
  // Convert provider to BrowserProvider if needed
  const ethersProvider = provider instanceof ethers.BrowserProvider 
    ? provider 
    : new ethers.BrowserProvider(provider as any);
  const routerContract = new ethers.Contract(ROUTER_ADDRESS, RouterABI, ethersProvider);
  try {
    const amounts = await routerContract.getAmountsOut(amountIn, path);
    return amounts[amounts.length - 1];
  } catch (error: any) {
    // If the error is about insufficient input amount or liquidity, return 0
    if (error?.message?.includes("INSUFFICIENT") || error?.message?.includes("INSUFFICIENT_LIQUIDITY")) {
      return 0n;
    }
    throw error;
  }
}

