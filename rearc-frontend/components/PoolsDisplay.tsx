"use client";

import { useSDK } from "@metamask/sdk-react";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  FACTORY_ADDRESS,
} from "@/lib/constants";
import { blockchainCache } from "@/lib/cache";
import { dataService } from "@/lib/dataService";
import { useSmartPolling } from "@/common/hooks";
import { rateLimiter } from "@/lib/rateLimiter";
import PairABI from "@/lib/abis/Pair.json";
import FactoryABI from "@/lib/abis/Factory.json";
import ERC20ABI from "@/lib/abis/ERC20.json";
import Table from "@components/Table";
import TableRow from "@components/TableRow";
import TableColumn from "@components/TableColumn";
import Button from "@components/Button";
import Link from "next/link";

interface PoolData {
  name: string;
  pairAddress: string;
  reserve0: bigint;
  reserve1: bigint;
  decimals0: number;
  decimals1: number;
  symbol0: string;
  symbol1: string;
}

interface PoolMetadata {
  pairAddress: string;
  token0: string;
  token1: string;
  symbol0: string;
  symbol1: string;
  decimals0: number;
  decimals1: number;
}

// Cache pool metadata in memory (doesn't change)
const poolMetadataCache = new Map<string, PoolMetadata>();

export default function PoolsDisplay() {
  const { provider } = useSDK();
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTVL, setTotalTVL] = useState(0);

  const fetchPools = useCallback(async () => {
    if (!provider) {
      setLoading(false);
      return;
    }

    try {
      if (!FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
        setLoading(false);
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider as any);
      
      // Check cache for factory pairs first
      const factoryPairsKey = blockchainCache.factoryPairsKey();
      let pairAddresses = blockchainCache.get<string[]>(factoryPairsKey);
      
      if (!pairAddresses || pairAddresses.length === 0) {
        const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, ethersProvider);
        const pairsLength = await rateLimiter.execute(async () => {
          return await factoryContract.allPairsLength();
        });

        // Fetch all pair addresses with rate limiting
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
        
        // Cache the pairs list
        blockchainCache.setWithTTL(factoryPairsKey, pairAddresses, 'FACTORY_PAIRS');
      }

      // First, collect all pair addresses that need reserves
      const validPairAddresses = pairAddresses.filter(addr => 
        addr && addr !== ethers.ZeroAddress
      );

      // Batch fetch reserves for all pairs using DataService
      const reservesMap = await dataService.getReserves(ethersProvider, validPairAddresses);

      // Process all pairs in parallel
      const poolPromises = pairAddresses.map(async (pairAddress) => {
        if (!pairAddress || pairAddress === ethers.ZeroAddress) return null;

        try {
          // Check cache first
          let metadata = poolMetadataCache.get(pairAddress);

          if (!metadata) {
            // Not in cache, fetch metadata
            const code = await ethersProvider.getCode(pairAddress).catch(() => '0x');
            if (code === '0x' || code.length <= 2) return null;

            const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
            const token0Address = await pairContract.token0().catch(() => null);
            const token1Address = await pairContract.token1().catch(() => null);

            if (!token0Address || !token1Address) return null;

            const token0Contract = new ethers.Contract(token0Address, ERC20ABI, ethersProvider);
            const token1Contract = new ethers.Contract(token1Address, ERC20ABI, ethersProvider);

            const [symbol0, symbol1, decimals0, decimals1] = await Promise.all([
              token0Contract.symbol().catch(() => "???"),
              token1Contract.symbol().catch(() => "???"),
              token0Contract.decimals().catch(() => 18),
              token1Contract.decimals().catch(() => 18),
            ]);

            metadata = {
              pairAddress,
              token0: token0Address,
              token1: token1Address,
              symbol0,
              symbol1,
              decimals0: Number(decimals0),
              decimals1: Number(decimals1),
            };

            // Cache it
            poolMetadataCache.set(pairAddress, metadata);
          }

          // Get reserves from batch fetch
          let reserves = reservesMap.get(pairAddress);
          
          // Fallback to cache if batch fetch didn't return it
          if (!reserves) {
            const reservesKey = blockchainCache.reservesKey(pairAddress);
            const cachedReserves = blockchainCache.get<[bigint, bigint]>(reservesKey);
            if (cachedReserves) {
              reserves = cachedReserves;
            }
          }

          if (!reserves) return null;

          return {
            name: `${metadata.symbol0} / ${metadata.symbol1}`,
            pairAddress: metadata.pairAddress,
            reserve0: reserves[0],
            reserve1: reserves[1],
            decimals0: metadata.decimals0,
            decimals1: metadata.decimals1,
            symbol0: metadata.symbol0,
            symbol1: metadata.symbol1,
          };
        } catch (error) {
          console.warn(`Error fetching pool at ${pairAddress}:`, error);
          return null;
        }
      });

      const poolsData = (await Promise.all(poolPromises)).filter((p): p is PoolData => p !== null);

      setPools(poolsData);
      
      // Calculate total TVL (assuming 1:1 price for stablecoins)
      const tvl = poolsData.reduce((sum, pool) => {
        const reserve0Value = parseFloat(ethers.formatUnits(pool.reserve0, pool.decimals0));
        const reserve1Value = parseFloat(ethers.formatUnits(pool.reserve1, pool.decimals1));
        return sum + reserve0Value + reserve1Value;
      }, 0);
      setTotalTVL(tvl);
    } catch (error) {
      console.error("Error fetching pools:", error);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (!provider) {
      setLoading(false);
      return;
    }
    
    // Initial fetch
    fetchPools();
    
    // Subscribe to reserve updates
    const unsubscribe = dataService.subscribe("reserves:update", fetchPools);
    
    return () => {
      unsubscribe();
    };
  }, [provider, fetchPools]);

  // Smart polling - pauses when tab is hidden
  useSmartPolling(fetchPools, 60000, {
    enabled: !!provider,
    hiddenInterval: 300000, // 5 minutes when hidden
  });

  if (loading) {
    return (
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>
            LOADING POOLS
            <span style={{ color: 'var(--theme-focused-foreground)' }}>_</span>
          </TableColumn>
        </TableRow>
      </Table>
    );
  }

  return (
    <>
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>Pool Pair</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>Total Liquidity</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>Reserve 0</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>Reserve 1</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>Actions</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        {pools.map((pool) => {
          const reserve0Formatted = ethers.formatUnits(pool.reserve0, pool.decimals0);
          const reserve1Formatted = ethers.formatUnits(pool.reserve1, pool.decimals1);
          const totalLiquidity = parseFloat(reserve0Formatted) + parseFloat(reserve1Formatted);
          
          return (
            <TableRow key={pool.pairAddress}>
              <TableColumn>{pool.name}</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>
                ${totalLiquidity.toFixed(2)}
              </TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>
                {parseFloat(reserve0Formatted).toFixed(2)} {pool.symbol0}
              </TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>
                {parseFloat(reserve1Formatted).toFixed(2)} {pool.symbol1}
              </TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>
                <Link href={`/liquidity?pool=${encodeURIComponent(pool.name)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Button theme="SECONDARY">VIEW</Button>
                </Link>
              </TableColumn>
            </TableRow>
          );
        })}
      </Table>
      <br />
      <br />
      <Table style={{ minWidth: '71ch' }}>
        <TableRow>
          <TableColumn>CF-3 Back&nbsp;&nbsp;&nbsp;&nbsp;CF7-Next Page&nbsp;&nbsp;&nbsp;&nbsp;CF21-Print Report</TableColumn>
        </TableRow>
      </Table>
    </>
  );
}

