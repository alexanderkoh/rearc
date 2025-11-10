"use client";

import { useSDK } from "@metamask/sdk-react";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { FACTORY_ADDRESS } from "@/lib/constants";
import { blockchainCache } from "@/lib/cache";
import { dataService } from "@/lib/dataService";
import { useSmartPolling } from "@/common/hooks";
import { rateLimiter } from "@/lib/rateLimiter";
import FactoryABI from "@/lib/abis/Factory.json";
import PairABI from "@/lib/abis/Pair.json";
import ERC20ABI from "@/lib/abis/ERC20.json";
import Table from "@components/Table";
import TableRow from "@components/TableRow";
import TableColumn from "@components/TableColumn";

interface PoolMetrics {
  totalPools: number;
  totalTVL: number;
  uniqueTokens: number;
  totalLPHolders: number;
}

export default function SystemMetrics() {
  const { provider } = useSDK();
  const [metrics, setMetrics] = useState<PoolMetrics>({
    totalPools: 0,
    totalTVL: 0,
    uniqueTokens: 0,
    totalLPHolders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uptime, setUptime] = useState(0);

  // Uptime counter (just for show - starts from component mount)
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setUptime(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = useCallback(async () => {
    if (!provider || !FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ethersProvider = new ethers.BrowserProvider(provider as any);
      
      // Check cache for factory pairs
      const factoryPairsKey = blockchainCache.factoryPairsKey();
      let pairAddresses = blockchainCache.get<string[]>(factoryPairsKey);
      
      if (!pairAddresses) {
        const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, ethersProvider);
        const pairsLength = await rateLimiter.execute(async () => {
          return await factoryContract.allPairsLength();
        });
        const pairAddressPromises: Promise<string | null>[] = [];
        for (let i = 0; i < pairsLength; i++) {
          pairAddressPromises.push(
            rateLimiter.execute(async () => {
              try {
                const addr = await factoryContract.allPairs(i);
                return (addr && addr !== ethers.ZeroAddress) ? addr : null;
              } catch {
                return null;
              }
            })
          );
        }
        pairAddresses = (await Promise.all(pairAddressPromises)).filter((addr): addr is string => addr !== null);
        blockchainCache.setWithTTL(factoryPairsKey, pairAddresses, 'FACTORY_PAIRS');
      }
      
      const pairsLength = pairAddresses.length;
      let totalTVL = 0;
      const tokenAddressesSet = new Set<string>();
      let totalLPHolders = 0;

      // Batch fetch reserves for all pairs
      const validPairAddresses = pairAddresses.filter(addr => 
        addr && addr !== ethers.ZeroAddress
      );
      const reservesMap = await dataService.getReserves(ethersProvider, validPairAddresses);

      // Process all pairs in parallel
      const poolPromises = pairAddresses.map(async (pairAddress) => {
        if (!pairAddress || pairAddress === ethers.ZeroAddress) return null;

        try {
          const code = await ethersProvider.getCode(pairAddress).catch(() => '0x');
          if (code === '0x' || code.length <= 2) return null;

          const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);

          // Get reserves from batch fetch or cache
          let reserves = reservesMap.get(pairAddress);
          if (!reserves) {
            const reservesKey = blockchainCache.reservesKey(pairAddress);
            const cachedReserves = blockchainCache.get<[bigint, bigint]>(reservesKey);
            if (cachedReserves) {
              reserves = cachedReserves;
            }
          }
          
          // First verify this is a valid pair by getting token addresses
          let token0Address: string | null = null;
          let token1Address: string | null = null;
          
          try {
            [token0Address, token1Address] = await Promise.all([
              rateLimiter.execute(async () => pairContract.token0()),
              rateLimiter.execute(async () => pairContract.token1()),
            ]);
          } catch (e) {
            // Silently skip invalid pairs
            return null;
          }

          if (!reserves || !token0Address || !token1Address) return null;
          
          // Now safely get totalSupply
          let totalSupply = 0n;
          try {
            totalSupply = await rateLimiter.execute(async () => pairContract.totalSupply());
          } catch (e) {
            // Use 0 if we can't get totalSupply
          }

          // Track unique tokens
          tokenAddressesSet.add(token0Address);
          tokenAddressesSet.add(token1Address);

          // Get token decimals with rate limiting
          const token0Contract = new ethers.Contract(token0Address, ERC20ABI, ethersProvider);
          const token1Contract = new ethers.Contract(token1Address, ERC20ABI, ethersProvider);
          const [decimals0, decimals1] = await Promise.all([
            rateLimiter.execute(async () => {
              return await token0Contract.decimals().catch(() => 18);
            }),
            rateLimiter.execute(async () => {
              return await token1Contract.decimals().catch(() => 18);
            }),
          ]);

          // Calculate TVL (assuming 1:1 price for simplicity)
          const reserve0Value = parseFloat(ethers.formatUnits(reserves[0], decimals0));
          const reserve1Value = parseFloat(ethers.formatUnits(reserves[1], decimals1));
          const poolTVL = reserve0Value + reserve1Value;

          // Estimate LP holders (simplified - just check if total supply > 0)
          const lpHolders = totalSupply > 0n ? 1 : 0;

          return {
            tvl: poolTVL,
            lpHolders,
          };
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(poolPromises);
      
      results.forEach((result) => {
        if (result) {
          totalTVL += result.tvl;
          totalLPHolders += result.lpHolders;
        }
      });

      setMetrics({
        totalPools: pairsLength,
        totalTVL,
        uniqueTokens: tokenAddressesSet.size,
        totalLPHolders,
      });
    } catch (error) {
      console.error("Error fetching system metrics:", error);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (!provider || !FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
      setLoading(false);
      return;
    }
    
    // Initial fetch
    fetchMetrics();
  }, [provider, fetchMetrics]);

  // Smart polling - pauses when tab is hidden
  useSmartPolling(fetchMetrics, 60000, {
    enabled: !!provider && !!FACTORY_ADDRESS,
    hiddenInterval: 300000, // 5 minutes when hidden
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>
            LOADING METRICS
            <span style={{ color: 'var(--theme-focused-foreground)' }}>_</span>
          </TableColumn>
        </TableRow>
      </Table>
    );
  }

  return (
    <Table style={{ minWidth: '71ch' }}>
      <TableRow>
        <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Platform Metrics</TableColumn>
        <TableColumn style={{ textAlign: 'right' }}>Real-time</TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;</TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Total Liquidity Pools:</TableColumn>
        <TableColumn style={{ textAlign: 'right' }}>{metrics.totalPools}</TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Total Value Locked (TVL):</TableColumn>
        <TableColumn style={{ textAlign: 'right' }}>${metrics.totalTVL.toFixed(2)}</TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Unique Tokens:</TableColumn>
        <TableColumn style={{ textAlign: 'right' }}>{metrics.uniqueTokens}</TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Active LP Positions:</TableColumn>
        <TableColumn style={{ textAlign: 'right' }}>{metrics.totalLPHolders}</TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;</TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;System Status:</TableColumn>
        <TableColumn style={{ textAlign: 'right', color: 'var(--theme-focused-foreground)' }}>
          ● ONLINE
        </TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Session Uptime:</TableColumn>
        <TableColumn style={{ textAlign: 'right' }}>{formatUptime(uptime)}</TableColumn>
      </TableRow>
      <TableRow>
        <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Last Update:</TableColumn>
        <TableColumn style={{ textAlign: 'right' }}>
          {new Date().toLocaleTimeString()}
        </TableColumn>
      </TableRow>
    </Table>
  );
}

