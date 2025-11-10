"use client";

import { useSDK } from "@metamask/sdk-react";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { FACTORY_ADDRESS, ROUTER_ADDRESS, ARC_EXPLORER_URL } from "@/lib/constants";
import { blockchainCache } from "@/lib/cache";
import { useSmartPolling } from "@/common/hooks";
import { rateLimiter } from "@/lib/rateLimiter";
import FactoryABI from "@/lib/abis/Factory.json";
import PairABI from "@/lib/abis/Pair.json";
import ERC20ABI from "@/lib/abis/ERC20.json";
import Table from "@components/Table";
import TableRow from "@components/TableRow";
import TableColumn from "@components/TableColumn";
import Button from "@components/Button";

interface SwapTransaction {
  txHash: string;
  timestamp: Date;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  fromSymbol: string;
  toSymbol: string;
  status: "Success" | "Pending" | "Failed";
  blockNumber: number;
}

const ITEMS_PER_PAGE = 5;

export default function RecentSwaps() {
  const { provider, account } = useSDK();
  const [swaps, setSwaps] = useState<SwapTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [tokenSymbols, setTokenSymbols] = useState<Map<string, string>>(new Map());
  const [tokenDecimals, setTokenDecimals] = useState<Map<string, number>>(new Map());

  // Fetch token symbol and decimals (uses cache)
  const getTokenInfo = async (address: string, ethersProvider: ethers.BrowserProvider): Promise<{ symbol: string; decimals: number }> => {
    const addrLower = address.toLowerCase();
    
    // Check component state cache first
    if (tokenSymbols.has(addrLower) && tokenDecimals.has(addrLower)) {
      return {
        symbol: tokenSymbols.get(addrLower)!,
        decimals: tokenDecimals.get(addrLower)!,
      };
    }
    
    // Check global cache
    const tokenInfoKey = blockchainCache.tokenInfoKey(address);
    const cached = blockchainCache.get<{ symbol: string; decimals: number; name?: string }>(tokenInfoKey);
    if (cached) {
      setTokenSymbols(prev => new Map(prev).set(addrLower, cached.symbol));
      setTokenDecimals(prev => new Map(prev).set(addrLower, cached.decimals));
      return { symbol: cached.symbol, decimals: cached.decimals };
    }
    
    try {
      const tokenContract = new ethers.Contract(address, ERC20ABI, ethersProvider);
      const [symbol, decimals] = await Promise.all([
        tokenContract.symbol().catch(() => "???"),
        tokenContract.decimals().catch(() => 18),
      ]);
      
      const info = { symbol, decimals };
      
      // Update component state
      setTokenSymbols(prev => new Map(prev).set(addrLower, symbol));
      setTokenDecimals(prev => new Map(prev).set(addrLower, decimals));
      
      // Update global cache
      blockchainCache.setWithTTL(tokenInfoKey, info, 'TOKEN_INFO');
      
      return info;
    } catch {
      const defaultInfo = { symbol: "???", decimals: 18 };
      blockchainCache.setWithTTL(tokenInfoKey, defaultInfo, 'TOKEN_INFO');
      return defaultInfo;
    }
  };

  const fetchRecentSwaps = useCallback(async () => {
    if (!provider || !FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
      return;
    }
      setLoading(true);
      try {
        const ethersProvider = new ethers.BrowserProvider(provider as any);
        
        // Check cache for factory pairs list
        const factoryPairsKey = blockchainCache.factoryPairsKey();
        let pairAddresses = blockchainCache.get<string[]>(factoryPairsKey);
        
        if (!pairAddresses) {
          const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, ethersProvider);
          const pairsLength = await rateLimiter.execute(async () => {
            return await factoryContract.allPairsLength();
          });
          pairAddresses = [];
          
          for (let i = 0; i < pairsLength; i++) {
            try {
              const pairAddress = await rateLimiter.execute(async () => {
                return await factoryContract.allPairs(i);
              });
              if (pairAddress && pairAddress !== ethers.ZeroAddress) {
                pairAddresses.push(pairAddress);
              }
            } catch (error) {
              console.warn(`Error getting pair ${i}:`, error);
              break; // Stop on error to avoid rate limiting
            }
          }
          
          // Cache the pairs list
          blockchainCache.setWithTTL(factoryPairsKey, pairAddresses, 'FACTORY_PAIRS');
        }

        // Get Swap events from all pairs
        // Check cache for swap history first
        const swapHistoryKey = 'swaps:history';
        const cachedSwaps = blockchainCache.get<SwapTransaction[]>(swapHistoryKey);
        if (cachedSwaps && cachedSwaps.length > 0) {
          setSwaps(cachedSwaps);
          setLoading(false);
          return; // Use cached data, will refresh on next interval
        }
        
        const swapEvents: SwapTransaction[] = [];
        const currentBlock = await ethersProvider.getBlockNumber();
        // Reduce block range to avoid rate limiting - only last 1000 blocks
        const fromBlock = Math.max(0, currentBlock - 1000);

        // Limit to first 5 pairs to avoid too many queries
        const limitedPairs = pairAddresses.slice(0, 5);
        
        for (const pairAddress of limitedPairs) {
          try {
            const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
            const [token0, token1] = await Promise.all([
              pairContract.token0().catch(() => null),
              pairContract.token1().catch(() => null),
            ]);

            if (!token0 || !token1) continue;

            // Get Swap events
            const filter = pairContract.filters.Swap();
            const events = await pairContract.queryFilter(filter, fromBlock, "latest");

            for (const event of events) {
              // Check if event is an EventLog with args
              if (!('args' in event) || !event.args) continue;

              const [sender, amount0In, amount1In, amount0Out, amount1Out, to] = event.args;
              
              // Determine which token was swapped in and out
              const amountIn = amount0In > 0n ? amount0In : amount1In;
              const amountOut = amount0Out > 0n ? amount0Out : amount1Out;
              const fromToken = amount0In > 0n ? token0 : token1;
              const toToken = amount0Out > 0n ? token0 : token1;

              if (amountIn === 0n || amountOut === 0n) continue;

              // Get token info (symbol and decimals) - uses cache internally
              const fromInfo = await getTokenInfo(fromToken, ethersProvider);
              const toInfo = await getTokenInfo(toToken, ethersProvider);

              // Get transaction receipt to check status
              let status: "Success" | "Pending" | "Failed" = "Success";
              let timestamp = new Date();
              
              if (event.transactionHash) {
                try {
                  const receipt = await ethersProvider.getTransactionReceipt(event.transactionHash);
                  if (receipt) {
                    status = receipt.status === 1 ? "Success" : "Failed";
                    const block = await ethersProvider.getBlock(receipt.blockNumber);
                    if (block) {
                      timestamp = new Date(Number(block.timestamp) * 1000);
                    }
                  }
                } catch {
                  // If we can't get receipt, assume success
                }
              }

              swapEvents.push({
                txHash: event.transactionHash || "",
                timestamp,
                fromToken,
                toToken,
                fromAmount: ethers.formatUnits(amountIn, fromInfo.decimals),
                toAmount: ethers.formatUnits(amountOut, toInfo.decimals),
                fromSymbol: fromInfo.symbol,
                toSymbol: toInfo.symbol,
                status,
                blockNumber: event.blockNumber || 0,
              });
            }
          } catch (error) {
            console.warn(`Error fetching swaps from pair ${pairAddress}:`, error);
          }
        }

        // Sort by timestamp (newest first)
        swapEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // Limit to last 20 swaps to reduce data size
        const limitedSwaps = swapEvents.slice(0, 20);

        // Cache the swap history
        blockchainCache.setWithTTL(swapHistoryKey, limitedSwaps, 'SWAP_HISTORY');
        
        setSwaps(limitedSwaps);
      } catch (error) {
        console.error("Error fetching recent swaps:", error);
      } finally {
        setLoading(false);
      }
  }, [provider]);

  // Use smart polling to fetch swaps with page visibility awareness
  useSmartPolling(fetchRecentSwaps, 90000, {
    enabled: !!provider && !!FACTORY_ADDRESS && ethers.isAddress(FACTORY_ADDRESS),
    hiddenInterval: 300000, // 5 minutes when hidden
  });

  // Pagination
  const totalPages = Math.ceil(swaps.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSwaps = swaps.slice(startIndex, endIndex);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return "0";
    if (num < 0.0001) return "<0.0001";
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const openTransaction = (txHash: string) => {
    if (txHash) {
      window.open(`${ARC_EXPLORER_URL}/tx/${txHash}`, "_blank");
    }
  };

  if (loading && swaps.length === 0) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn colSpan={5} style={{ textAlign: 'center' }}>
            LOADING RECENT SWAPS...
          </TableColumn>
        </TableRow>
      </Table>
    );
  }

  if (swaps.length === 0) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn colSpan={5} style={{ textAlign: 'center' }}>
            NO RECENT SWAPS FOUND
          </TableColumn>
        </TableRow>
      </Table>
    );
  }

  return (
    <>
      <Table style={{ minWidth: '71ch' }}>
        {currentSwaps.map((swap, index) => (
          <TableRow key={`${swap.txHash}-${index}`} style={{ cursor: swap.txHash ? 'pointer' : 'default' }} onClick={() => swap.txHash && openTransaction(swap.txHash)}>
            <TableColumn>{formatTime(swap.timestamp)}</TableColumn>
            <TableColumn>{swap.fromSymbol}</TableColumn>
            <TableColumn>{swap.toSymbol}</TableColumn>
            <TableColumn style={{ textAlign: 'right' }}>
              {formatAmount(swap.fromAmount)} → {formatAmount(swap.toAmount)}
            </TableColumn>
            <TableColumn style={{ textAlign: 'right', color: swap.status === 'Success' ? 'var(--theme-focused-foreground)' : swap.status === 'Failed' ? 'red' : 'orange' }}>
              {swap.status}
            </TableColumn>
          </TableRow>
        ))}
      </Table>
      
      {totalPages > 1 && (
        <Table style={{ minWidth: '71ch', marginTop: '1rem' }}>
          <TableRow>
            <TableColumn colSpan={5} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <Button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  isDisabled={currentPage === 1}
                  theme="SECONDARY"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  PREV
                </Button>
                <span>
                  Page {currentPage} of {totalPages} ({swaps.length} total)
                </span>
                <Button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  isDisabled={currentPage === totalPages}
                  theme="SECONDARY"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  NEXT
                </Button>
              </div>
            </TableColumn>
          </TableRow>
        </Table>
      )}
    </>
  );
}

