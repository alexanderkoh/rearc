"use client";

import { useSDK } from "@metamask/sdk-react";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  USDC_ADDRESS,
  EURC_ADDRESS,
  REARC_ADDRESS,
  NYC1_ADDRESS,
  USDC_DECIMALS,
  EURC_DECIMALS,
  REARC_DECIMALS,
  NYC1_DECIMALS,
  ROUTER_ADDRESS,
} from "@/lib/constants";
import {
  getReserves,
  checkAllowance,
  approveToken,
  executeSwap,
  getEstimatedOutput,
} from "@/lib/swap";
import { getPairAddress, findSwapPath, discoverTokensFromFactory } from "@/lib/liquidity";
import { blockchainCache } from "@/lib/cache";
import { rateLimiter } from "@/lib/rateLimiter";
import ERC20ABI from "@/lib/abis/ERC20.json";
import Input from "@components/Input";
import Button from "@components/Button";
import Select from "@components/Select";
import Table from "@components/Table";
import TableRow from "@components/TableRow";
import TableColumn from "@components/TableColumn";

type TokenType = "USDC" | "EURC" | "REARC" | "NYC1";

interface TokenConfig {
  address: string;
  decimals: number;
  symbol: string;
}

const TOKENS: Record<TokenType, TokenConfig> = {
  USDC: { address: USDC_ADDRESS, decimals: USDC_DECIMALS, symbol: "USDC" },
  EURC: { address: EURC_ADDRESS, decimals: EURC_DECIMALS, symbol: "EURC" },
  REARC: { address: REARC_ADDRESS, decimals: REARC_DECIMALS, symbol: "REARC" },
  NYC1: { address: NYC1_ADDRESS, decimals: NYC1_DECIMALS, symbol: "NYC1" },
};

// Filter out tokens with empty addresses and include discovered tokens
const getAvailableTokens = (discoveredTokens?: Map<string, { symbol: string; decimals: number; name?: string }>): TokenType[] => {
  const hardcodedTokens = (Object.keys(TOKENS) as TokenType[]).filter(token => {
    const config = TOKENS[token];
    return config.address && config.address !== "" && ethers.isAddress(config.address);
  });
  
  // For now, return hardcoded tokens. In the future, we could merge discovered tokens
  // but that would require a more dynamic token selection UI
  return hardcodedTokens;
};

// Helper to get token config, checking discovered tokens if hardcoded address is missing
const getTokenConfig = (
  tokenType: TokenType,
  discoveredTokens: Map<string, { symbol: string; decimals: number; name?: string }>
): TokenConfig | null => {
  const hardcoded = TOKENS[tokenType];
  
  // If hardcoded address exists and is valid, use it
  if (hardcoded.address && hardcoded.address !== "" && ethers.isAddress(hardcoded.address)) {
    return hardcoded;
  }
  
  // Otherwise, try to find in discovered tokens by symbol
  for (const [address, info] of discoveredTokens.entries()) {
    if (info.symbol === tokenType) {
      return {
        address: address,
        decimals: info.decimals,
        symbol: info.symbol,
      };
    }
  }
  
  return null;
};

export default function SwapInterface() {
  const { provider, account } = useSDK();
  const [fromToken, setFromToken] = useState<TokenType>("USDC");
  const [toToken, setToToken] = useState<TokenType>("EURC");
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [fromBalance, setFromBalance] = useState<string>("0.00");
  const [toBalance, setToBalance] = useState<string>("0.00");
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [priceImpact, setPriceImpact] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string>("");
  const [discoveredTokens, setDiscoveredTokens] = useState<Map<string, { symbol: string; decimals: number; name?: string }>>(new Map());

  // Get token configs, using discovered tokens if hardcoded address is missing
  const fromConfig = getTokenConfig(fromToken, discoveredTokens) || TOKENS[fromToken];
  const toConfig = getTokenConfig(toToken, discoveredTokens) || TOKENS[toToken];
  const [pairAddress, setPairAddress] = useState<string>("");
  const [swapPath, setSwapPath] = useState<string[]>([]);
  
  // Discover tokens from Factory on mount and when provider changes (cached, so less frequent)
  useEffect(() => {
    if (provider) {
      const discoverTokens = async () => {
        const ethersProvider = provider instanceof ethers.BrowserProvider 
          ? provider 
          : new ethers.BrowserProvider(provider as any);
        const tokens = await discoverTokensFromFactory(ethersProvider);
        setDiscoveredTokens(tokens);
      };
      discoverTokens();
    }
  }, [provider]);

  // Fetch balances with smart polling and DataService batching
  const fetchBalances = useCallback(async () => {
    if (!provider || !account) return;
    
    // Validate addresses before creating contracts
    if (!fromConfig.address || !toConfig.address || 
        !ethers.isAddress(fromConfig.address) || !ethers.isAddress(toConfig.address)) {
      return;
    }
    
      try {
        const ethersProvider = new ethers.BrowserProvider(provider as any);
        
        // Fetch balances with rate limiting
        const fromContract = new ethers.Contract(fromConfig.address, ERC20ABI, ethersProvider);
        const toContract = new ethers.Contract(toConfig.address, ERC20ABI, ethersProvider);
        
        const fromBal = await rateLimiter.execute(async () => fromContract.balanceOf(account));
        const toBal = await rateLimiter.execute(async () => toContract.balanceOf(account));
        
        setFromBalance(ethers.formatUnits(fromBal, fromConfig.decimals));
        setToBalance(ethers.formatUnits(toBal, toConfig.decimals));
      } catch (error) {
        console.error("Error fetching balances:", error);
      }
  }, [provider, account, fromConfig.address, toConfig.address, fromConfig.decimals, toConfig.decimals]);

  useEffect(() => {
    if (!provider || !account) return;
    
    // Initial fetch
    fetchBalances();
    
    // Poll every 2 minutes
    const interval = setInterval(fetchBalances, 120000);
    return () => clearInterval(interval);
  }, [provider, account, fromConfig.address, toConfig.address, fetchBalances]);

  // Find swap path (direct or multi-hop) when tokens change
  useEffect(() => {
    if (provider) {
      const findPath = async () => {
        const ethersProvider = provider instanceof ethers.BrowserProvider 
          ? provider 
          : new ethers.BrowserProvider(provider as any);
        const path = await findSwapPath(fromConfig.address, toConfig.address, ethersProvider);
        if (path.length >= 2) {
          setSwapPath(path);
          // For direct pairs, also set pairAddress for backward compatibility
          if (path.length === 2) {
            const address = await getPairAddress(fromConfig.address, toConfig.address, ethersProvider);
            setPairAddress(address);
          } else {
            // Multi-hop path - set pairAddress to empty but path is available
            setPairAddress("");
          }
        } else {
          setSwapPath([]);
          setPairAddress("");
        }
      };
      findPath();
    } else {
      setSwapPath([]);
      setPairAddress("");
    }
  }, [provider, fromToken, toToken, fromConfig.address, toConfig.address]);

  const updateExchangeRate = async () => {
    if (!provider) return;
    
    const ethersProvider = provider instanceof ethers.BrowserProvider 
      ? provider 
      : new ethers.BrowserProvider(provider as any);
    
    // For direct pairs, calculate from reserves
    if (swapPath.length === 2 && pairAddress && pairAddress !== "" && ethers.isAddress(pairAddress)) {
      try {
        const [reserve0, reserve1] = await getReserves(ethersProvider, pairAddress);
        
        const fromIsToken0 = fromConfig.address.toLowerCase() < toConfig.address.toLowerCase();
        const reserveIn = fromIsToken0 ? reserve0 : reserve1;
        const reserveOut = fromIsToken0 ? reserve1 : reserve0;
        
        if (reserveIn > 0n && reserveOut > 0n) {
          // Adjust for decimals
          const reserveInAdjusted = parseFloat(ethers.formatUnits(reserveIn, fromConfig.decimals));
          const reserveOutAdjusted = parseFloat(ethers.formatUnits(reserveOut, toConfig.decimals));
          const rate = reserveOutAdjusted / reserveInAdjusted;
          setExchangeRate(rate);
        } else {
          setExchangeRate(0);
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
        setExchangeRate(0);
      }
    } else if (swapPath.length > 2 && ROUTER_ADDRESS) {
      // For multi-hop, calculate exchange rate using Router with a small test amount
      try {
        const testAmount = ethers.parseUnits("1", fromConfig.decimals);
        const estimated = await getEstimatedOutput(ethersProvider, testAmount, swapPath);
        if (estimated > 0n) {
          const estimatedFormatted = parseFloat(ethers.formatUnits(estimated, toConfig.decimals));
          setExchangeRate(estimatedFormatted); // 1 unit of fromToken = estimatedFormatted units of toToken
        } else {
          setExchangeRate(0);
        }
      } catch (error) {
        console.error("Error fetching multi-hop exchange rate:", error);
        setExchangeRate(0);
      }
    }
  };

  // Update exchange rate with smart polling
  const updateExchangeRateCallback = useCallback(async () => {
    if (!provider || swapPath.length < 2) return;
    await updateExchangeRate();
  }, [provider, swapPath, pairAddress, fromConfig.address, toConfig.address, fromConfig.decimals, toConfig.decimals]);

  useEffect(() => {
    if (provider && swapPath.length >= 2) {
      updateExchangeRate();
    }
  }, [provider, fromToken, toToken, pairAddress, swapPath]);

  // Poll exchange rate every 2 minutes
  useEffect(() => {
    if (!provider || swapPath.length < 2) return;
    
    const interval = setInterval(updateExchangeRateCallback, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [provider, swapPath.length, updateExchangeRateCallback]);

  useEffect(() => {
    if (amountIn && provider && account && swapPath.length >= 2) {
      // Debounce calculateOutput to avoid too many RPC calls while typing
      const timeoutId = setTimeout(() => {
        calculateOutput();
        checkTokenApproval();
      }, 500); // Wait 500ms after user stops typing
      
      return () => clearTimeout(timeoutId);
    } else {
      setAmountOut("");
      setPriceImpact(0);
    }
  }, [amountIn, fromToken, toToken, provider, account, swapPath]);

  const calculateOutput = async () => {
    if (!provider || !amountIn || !ROUTER_ADDRESS || swapPath.length < 2) {
      setAmountOut("");
      setPriceImpact(0);
      return;
    }
    
    // Validate amount input
    const amountNum = parseFloat(amountIn);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAmountOut("");
      setPriceImpact(0);
      return;
    }
    
    try {
      const amountInWei = ethers.parseUnits(amountIn, fromConfig.decimals);
      
      // Don't call if amount is 0
      if (amountInWei === 0n) {
        setAmountOut("");
        setPriceImpact(0);
        return;
      }
      
      const ethersProvider = provider instanceof ethers.BrowserProvider 
        ? provider 
        : new ethers.BrowserProvider(provider as any);
      
      // Use the found swap path (direct or multi-hop)
      const estimated = await getEstimatedOutput(ethersProvider, amountInWei, swapPath);
      
      if (estimated === 0n) {
        setAmountOut("");
        setPriceImpact(0);
        return;
      }
      
      const estimatedFormatted = ethers.formatUnits(estimated, toConfig.decimals);
      setAmountOut(estimatedFormatted);
      
      // Calculate price impact
      if (exchangeRate > 0) {
        const expectedOut = amountNum * exchangeRate;
        const actualOut = parseFloat(estimatedFormatted);
        const impact = expectedOut > 0 ? ((expectedOut - actualOut) / expectedOut) * 100 : 0;
        setPriceImpact(Math.max(0, impact));
      }
    } catch (error: any) {
      console.error("Error calculating output:", error);
      setAmountOut("");
      setPriceImpact(0);
      // Don't show error to user for calculation errors, just clear output
    }
  };

  const checkTokenApproval = async () => {
    if (!provider || !account || !amountIn || !ROUTER_ADDRESS) return;
    try {
      const amountInWei = ethers.parseUnits(amountIn, fromConfig.decimals);
      const ethersProvider = provider instanceof ethers.BrowserProvider 
        ? provider 
        : new ethers.BrowserProvider(provider as any);
      const allowance = await checkAllowance(ethersProvider, fromConfig.address, account, ROUTER_ADDRESS);
      setNeedsApproval(allowance < amountInWei);
    } catch (error) {
      console.error("Error checking allowance:", error);
    }
  };

  const handleApprove = async () => {
    if (!provider || !account) return;
    setLoading(true);
    setError("");
    try {
      const signer = await new ethers.BrowserProvider(provider as any).getSigner();
      await approveToken(signer, fromConfig.address, ROUTER_ADDRESS);
      
      // Invalidate allowance cache
      blockchainCache.invalidatePattern(/^allowance:/);
      setNeedsApproval(false);
    } catch (error: any) {
      setError(error.message || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!provider || !account || !amountIn || !amountOut || swapPath.length < 2) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const signer = await new ethers.BrowserProvider(provider as any).getSigner();
      const amountInWei = ethers.parseUnits(amountIn, fromConfig.decimals);
      const minAmountOut = ethers.parseUnits(
        (parseFloat(amountOut) * 0.99).toFixed(toConfig.decimals),
        toConfig.decimals
      );
      
      // Execute swap
      const tx = await executeSwap(signer, amountInWei, minAmountOut, swapPath, account);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        // Invalidate caches and refresh balances immediately
        blockchainCache.invalidatePattern(/^balance:/);
        blockchainCache.invalidatePattern(/^reserves:/);
        
        // Refresh balances immediately after transaction
        await fetchBalances();
      
      // Show success message
      setSuccess(`✓ Swap successful! ${amountIn} ${fromToken} → ${amountOut} ${toToken}`);
      
      // Clear inputs
      setAmountIn("");
      setAmountOut("");
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess("");
      }, 5000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      setError(error.message || "Swap failed");
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  const swapDirection = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmountIn("");
    setAmountOut("");
  };

  const handleMax = () => {
    const balance = parseFloat(fromBalance);
    if (balance > 0) {
      // Leave a tiny bit for gas (0.1% or minimum 0.0001)
      const maxAmount = Math.max(0, balance - Math.max(balance * 0.001, 0.0001));
      setAmountIn(maxAmount.toFixed(fromConfig.decimals));
    }
  };

  const handleMaxTo = () => {
    // Swap direction and set max on the new "from" token
    // Use the current toBalance (which will become fromBalance after swap)
    const balance = parseFloat(toBalance);
    const decimals = toConfig.decimals;
    
    // Swap direction first
    swapDirection();
    
    // Set max amount after swap (use setTimeout to ensure state update completes)
    if (balance > 0) {
      const maxAmount = Math.max(0, balance - Math.max(balance * 0.001, 0.0001));
      setTimeout(() => {
        setAmountIn(maxAmount.toFixed(decimals));
      }, 100);
    }
  };

  // Get available tokens for selection (exclude the current toToken from fromToken options and vice versa)
  // Include tokens that have either hardcoded addresses OR discovered addresses
  const getAvailableTokensWithDiscovery = (): TokenType[] => {
    return (Object.keys(TOKENS) as TokenType[]).filter(token => {
      const hardcoded = TOKENS[token];
      // If hardcoded address exists and is valid, include it
      if (hardcoded.address && hardcoded.address !== "" && ethers.isAddress(hardcoded.address)) {
        return true;
      }
      // Otherwise, check if we discovered it
      for (const [address, info] of discoveredTokens.entries()) {
        if (info.symbol === token) {
          return true;
        }
      }
      return false;
    });
  };
  
  const availableTokens = getAvailableTokensWithDiscovery();
  const availableFromTokens = availableTokens.filter(t => t !== toToken);
  const availableToTokens = availableTokens.filter(t => t !== fromToken);
  
  // If current selection has invalid address, reset to first available token
  useEffect(() => {
    if (!availableTokens.includes(fromToken) && availableTokens.length > 0) {
      setFromToken(availableTokens[0]);
    }
    if (!availableTokens.includes(toToken) && availableTokens.length > 1) {
      setToToken(availableTokens[1]);
    } else if (!availableTokens.includes(toToken) && availableTokens.length === 1) {
      setToToken(availableTokens[0]);
    }
  }, [availableTokens.length, discoveredTokens.size]);

  if (!account) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;CONNECT WALLET TO SWAP</TableColumn>
        </TableRow>
      </Table>
    );
  }

  if (swapPath.length < 2) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;NO SWAP PATH AVAILABLE FOR {fromToken}/{toToken}</TableColumn>
        </TableRow>
      </Table>
    );
  }

  return (
    <>
      {error && (
        <Table style={{ minWidth: '71ch', width: '100%' }}>
          <TableRow>
            <TableColumn colSpan={2}>ERROR: {error}</TableColumn>
          </TableRow>
        </Table>
      )}
      {success && (
        <Table style={{ minWidth: '71ch', width: '100%' }}>
          <TableRow>
            <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
              {success}
            </TableColumn>
          </TableRow>
        </Table>
      )}
      <Table style={{ minWidth: '71ch', width: '100%' }}>
        <TableRow>
          <TableColumn style={{ width: '50%' }}>From Token:</TableColumn>
          <TableColumn style={{ width: '50%' }}>To Token:</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn style={{ width: '50%' }}>
            <Select
              name="from_token"
              options={availableFromTokens}
              defaultValue={fromToken}
              onChange={(value) => {
                setFromToken(value as TokenType);
                setAmountIn("");
                setAmountOut("");
              }}
            />
          </TableColumn>
          <TableColumn style={{ width: '50%' }}>
            <Select
              name="to_token"
              options={availableToTokens}
              defaultValue={toToken}
              onChange={(value) => {
                setToToken(value as TokenType);
                setAmountIn("");
                setAmountOut("");
              }}
            />
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn style={{ width: '50%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span>Balance: {parseFloat(fromBalance).toFixed(4)}</span>
              <Button onClick={handleMax} theme="SECONDARY" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                MAX
              </Button>
            </div>
            <Input
              label="AMOUNT"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.00"
              type="number"
            />
          </TableColumn>
          <TableColumn style={{ width: '50%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span>Balance: {parseFloat(toBalance).toFixed(4)}</span>
              <Button onClick={handleMaxTo} theme="SECONDARY" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                MAX
              </Button>
            </div>
            <Input
              label="AMOUNT"
              value={amountOut || "0.00"}
              placeholder="0.00"
              type="number"
              readOnly
            />
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>Exchange Rate:</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>
            {exchangeRate > 0 ? `1 ${fromToken} = ${exchangeRate.toFixed(6)} ${toToken}` : `1 ${fromToken} = 0.00 ${toToken}`}
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>Price Impact:</TableColumn>
          <TableColumn style={{ textAlign: 'right', color: priceImpact > 1 ? 'var(--theme-focused-foreground)' : 'inherit' }}>
            {priceImpact > 0 ? `${priceImpact.toFixed(2)}%` : "0.00%"}
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>Network Fee:</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>
            {amountIn ? `${(parseFloat(amountIn) * 0.003).toFixed(6)} ${fromToken}` : `0.00 ${fromToken}`}
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        {(needsApproval || (amountIn && parseFloat(amountIn) > parseFloat(fromBalance))) && (
          <>
            <TableRow>
              <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
                {parseFloat(amountIn) > parseFloat(fromBalance) 
                  ? "→ INSUFFICIENT BALANCE"
                  : "→ APPROVAL REQUIRED: You must approve the token before swapping"}
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
          </>
        )}
        <TableRow>
          <TableColumn colSpan={2}>
            {needsApproval ? (
              <Button onClick={handleApprove} isDisabled={loading} style={{ width: '100%' }}>
                {loading ? "APPROVING..." : `APPROVE ${fromToken}`}
              </Button>
            ) : (
              <Button 
                onClick={handleSwap} 
                isDisabled={loading || !amountIn || !amountOut || parseFloat(amountIn) > parseFloat(fromBalance)}
                style={{ width: '100%' }}
              >
                {loading ? "SWAPPING..." : "EXECUTE SWAP"}
              </Button>
            )}
          </TableColumn>
        </TableRow>
      </Table>
    </>
  );
}
