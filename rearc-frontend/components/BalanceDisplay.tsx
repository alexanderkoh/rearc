"use client";

import { useSDK } from "@metamask/sdk-react";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  FACTORY_ADDRESS,
} from "@/lib/constants";
import { rateLimiter } from "@/lib/rateLimiter";
import ERC20ABI from "@/lib/abis/ERC20.json";
import FactoryABI from "@/lib/abis/Factory.json";
import PairABI from "@/lib/abis/Pair.json";
import Table from "@components/Table";
import TableRow from "@components/TableRow";
import TableColumn from "@components/TableColumn";

interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceRaw: bigint;
}

interface LPBalance {
  poolName: string;
  balance: string;
  pairAddress: string;
}

// Cache for discovered tokens (in memory, persists during session)
let cachedTokenAddresses: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export default function BalanceDisplay() {
  const { provider, account } = useSDK();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [lpBalances, setLpBalances] = useState<LPBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (!provider || !account) {
      setLoading(false);
      return;
    }
    
    try {
      const ethersProvider = new ethers.BrowserProvider(provider as any);

      if (!FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
        setLoading(false);
        return;
      }

      // Step 1: Get all pair addresses from factory
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, ethersProvider);
      
      let pairAddresses: string[] = [];
      try {
        const pairsLength = await rateLimiter.execute(async () => factoryContract.allPairsLength());
        
        for (let i = 0; i < pairsLength; i++) {
          const pairAddress = await rateLimiter.execute(async () => factoryContract.allPairs(i));
          if (pairAddress && pairAddress !== ethers.ZeroAddress) {
            pairAddresses.push(pairAddress);
          }
        }
      } catch (error) {
        console.error("Error fetching pairs from factory:", error);
      }

      // Step 2: Discover unique token addresses from pairs (with caching)
      let tokenAddresses: string[] = [];
      
      const now = Date.now();
      if (cachedTokenAddresses && (now - cacheTimestamp) < CACHE_DURATION) {
        // Use cached tokens
        tokenAddresses = cachedTokenAddresses;
      } else {
        // Discover tokens from pairs
        const uniqueTokens = new Set<string>();
        
        for (const pairAddress of pairAddresses) {
          try {
            const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
            const token0 = await rateLimiter.execute(async () => pairContract.token0());
            const token1 = await rateLimiter.execute(async () => pairContract.token1());
            
            if (token0 && ethers.isAddress(token0)) {
              uniqueTokens.add(token0.toLowerCase());
            }
            if (token1 && ethers.isAddress(token1)) {
              uniqueTokens.add(token1.toLowerCase());
            }
          } catch (error) {
            console.warn(`Error getting tokens from pair ${pairAddress}:`, error);
          }
        }
        
        tokenAddresses = Array.from(uniqueTokens);
        
        // Cache the discovered tokens
        cachedTokenAddresses = tokenAddresses;
        cacheTimestamp = now;
      }

      if (tokenAddresses.length === 0) {
        setLoading(false);
        return;
      }

      // Step 3: Fetch token info and balances (one by one with rate limiting)
      const tokenBalancesArray: TokenBalance[] = [];
      
      for (const address of tokenAddresses) {
        try {
          // Verify this is an actual token contract by checking code
          const code = await ethersProvider.getCode(address);
          if (!code || code === '0x' || code.length <= 2) {
            continue; // Skip if no contract at this address
          }
          
          const tokenContract = new ethers.Contract(address, ERC20ABI, ethersProvider);
          
          // Fetch symbol, decimals, and balance with individual error handling
          let symbol: string;
          let decimals: number;
          let balanceRaw: bigint;
          
          try {
            symbol = await rateLimiter.execute(async () => tokenContract.symbol());
          } catch (e) {
            console.warn(`Skipping ${address}: cannot read symbol`);
            continue; // Skip this token if we can't get basic info
          }
          
          try {
            decimals = Number(await rateLimiter.execute(async () => tokenContract.decimals()));
          } catch (e) {
            console.warn(`Skipping ${address}: cannot read decimals`);
            continue;
          }
          
          try {
            balanceRaw = await rateLimiter.execute(async () => tokenContract.balanceOf(account));
          } catch (e) {
            console.warn(`Skipping ${address}: cannot read balance`);
            continue;
          }
          
          tokenBalancesArray.push({
            address,
            symbol,
            decimals,
            balance: ethers.formatUnits(balanceRaw, decimals),
            balanceRaw,
          });
        } catch (error) {
          console.warn(`Error fetching info for token ${address}:`, error);
        }
      }

      // Sort: tokens with balance > 0 first, then by symbol
      tokenBalancesArray.sort((a, b) => {
        if (a.balanceRaw > 0n && b.balanceRaw === 0n) return -1;
        if (a.balanceRaw === 0n && b.balanceRaw > 0n) return 1;
        if (a.balanceRaw !== b.balanceRaw) {
          return Number(b.balanceRaw - a.balanceRaw);
        }
        return a.symbol.localeCompare(b.symbol);
      });

      setTokenBalances(tokenBalancesArray);

      // Step 4: Fetch LP token balances
      const lpBalancesArray: LPBalance[] = [];
      
      for (const pairAddress of pairAddresses) {
        try {
          const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
          
          const lpBalance = await rateLimiter.execute(async () =>
            pairContract.balanceOf(account).catch(() => 0n)
          );

          // Only include pairs where we have LP tokens
          if (lpBalance > 0n) {
            const [token0Address, token1Address] = await Promise.all([
              rateLimiter.execute(async () => pairContract.token0()),
              rateLimiter.execute(async () => pairContract.token1()),
            ]);

            if (token0Address && token1Address) {
              const token0Contract = new ethers.Contract(token0Address, ERC20ABI, ethersProvider);
              const token1Contract = new ethers.Contract(token1Address, ERC20ABI, ethersProvider);

              const [symbol0, symbol1] = await Promise.all([
                rateLimiter.execute(async () => token0Contract.symbol().catch(() => "???")),
                rateLimiter.execute(async () => token1Contract.symbol().catch(() => "???")),
              ]);

              lpBalancesArray.push({
                poolName: `${symbol0}/${symbol1}`,
                balance: ethers.formatUnits(lpBalance, 18),
                pairAddress,
              });
            }
          }
        } catch (error) {
          console.warn(`Error fetching LP balance for ${pairAddress}:`, error);
        }
      }

      setLpBalances(lpBalancesArray);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setLoading(false);
    }
  }, [provider, account]);

  // Fetch balances on mount and every 2 minutes
  useEffect(() => {
    if (!provider || !account) return;
    
    fetchBalances();
    const interval = setInterval(fetchBalances, 120000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [fetchBalances, provider, account]);

  if (!account) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;CONNECT WALLET TO VIEW BALANCES</TableColumn>
        </TableRow>
      </Table>
    );
  }

  if (loading) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>
            LOADING
            <span style={{ color: 'var(--theme-focused-foreground)' }}>_</span>
          </TableColumn>
        </TableRow>
      </Table>
    );
  }

  // Separate tokens with balance > 0 and balance = 0
  const tokensWithBalance = tokenBalances.filter(t => t.balanceRaw > 0n);
  const tokensWithoutBalance = tokenBalances.filter(t => t.balanceRaw === 0n);

  return (
    <Table style={{ minWidth: '71ch' }}>
      {tokensWithBalance.length > 0 ? (
        <>
          <TableRow>
            <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Token Balances:</TableColumn>
          </TableRow>
          {tokensWithBalance.map((token) => (
            <TableRow key={token.address}>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{token.symbol}:</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>
                {parseFloat(token.balance).toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 6 
                })}
              </TableColumn>
            </TableRow>
          ))}
        </>
      ) : (
        <TableRow>
          <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;No token balances found</TableColumn>
        </TableRow>
      )}
      
      {lpBalances.length > 0 && (
        <>
          <TableRow>
            <TableColumn>&nbsp;</TableColumn>
          </TableRow>
          <TableRow>
            <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;LP Tokens (Liquidity Positions):</TableColumn>
          </TableRow>
          {lpBalances.map((lp) => (
            <TableRow key={lp.pairAddress}>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{lp.poolName} LP:</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>
                {parseFloat(lp.balance).toFixed(6)}
              </TableColumn>
            </TableRow>
          ))}
        </>
      )}

      {tokensWithoutBalance.length > 0 && (
        <>
          <TableRow>
            <TableColumn>&nbsp;</TableColumn>
          </TableRow>
          <TableRow>
            <TableColumn style={{ color: 'var(--theme-inactive-foreground)', fontSize: '0.9em' }}>
              &nbsp;&nbsp;&nbsp;&nbsp;Available tokens (0 balance): {tokensWithoutBalance.map(t => t.symbol).join(', ')}
            </TableColumn>
          </TableRow>
        </>
      )}
    </Table>
  );
}
