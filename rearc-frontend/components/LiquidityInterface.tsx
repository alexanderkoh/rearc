"use client";

import { useSDK } from "@metamask/sdk-react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
  FACTORY_ADDRESS,
} from "@/lib/constants";
import {
  getPairReserves,
  calculateRequiredAmount,
  getEstimatedLiquidity,
  addLiquidity,
  removeLiquidity,
  getEstimatedRemoveAmounts,
  getPairAddress,
  calculateImpliedRate,
} from "@/lib/liquidity";
import { checkAllowance, approveToken } from "@/lib/swap";
import { useSmartPolling } from "@/common/hooks";
import PairABI from "@/lib/abis/Pair.json";
import FactoryABI from "@/lib/abis/Factory.json";
import ERC20ABI from "@/lib/abis/ERC20.json";
import Input from "@components/Input";
import Button from "@components/Button";
import Select from "@components/Select";
import Table from "@components/Table";
import TableRow from "@components/TableRow";
import TableColumn from "@components/TableColumn";

interface PoolInfo {
  name: string;
  pairAddress: string;
  token0: string;
  token1: string;
  symbol0: string;
  symbol1: string;
  decimals0: number;
  decimals1: number;
}

export default function LiquidityInterface() {
  const { provider, account } = useSDK();
  const searchParams = useSearchParams();
  const poolFromUrl = searchParams.get("pool");
  const [availablePools, setAvailablePools] = useState<PoolInfo[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [selectedPool, setSelectedPool] = useState<string>(poolFromUrl || "");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [reserveA, setReserveA] = useState<bigint>(0n);
  const [reserveB, setReserveB] = useState<bigint>(0n);
  const [estimatedLiquidity, setEstimatedLiquidity] = useState<string>("0");
  const [totalSupply, setTotalSupply] = useState<bigint>(0n);
  const [userLpBalance, setUserLpBalance] = useState<bigint>(0n);
  const [impliedRate, setImpliedRate] = useState<string | null>(null);
  const [removePercentage, setRemovePercentage] = useState("");
  const [estimatedRemoveA, setEstimatedRemoveA] = useState<string>("0");
  const [estimatedRemoveB, setEstimatedRemoveB] = useState<string>("0");
  const [showRemoveMode, setShowRemoveMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsApprovalA, setNeedsApprovalA] = useState(false);
  const [needsApprovalB, setNeedsApprovalB] = useState(false);
  const [needsApprovalLP, setNeedsApprovalLP] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string>("");

  // Fetch all available pools from Factory
  const fetchPools = useCallback(async () => {
    if (!provider || !FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
      setLoadingPools(false);
      return;
    }

    setLoadingPools(true);
    try {
      const ethersProvider = new ethers.BrowserProvider(provider as any);
        const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, ethersProvider);
        const pairsLength = await factoryContract.allPairsLength();

        const pools: PoolInfo[] = [];

        for (let i = 0; i < pairsLength; i++) {
          try {
            const pairAddress = await factoryContract.allPairs(i).catch(() => null);
            if (!pairAddress || pairAddress === ethers.ZeroAddress) continue;

            const code = await ethersProvider.getCode(pairAddress).catch(() => '0x');
            if (code === '0x' || code.length <= 2) continue;

            const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);

            const token0Address = await pairContract.token0().catch((err) => {
              console.warn(`Failed to get token0 for pair ${i}:`, err.message);
              return null;
            });
            const token1Address = await pairContract.token1().catch((err) => {
              console.warn(`Failed to get token1 for pair ${i}:`, err.message);
              return null;
            });

            if (!token0Address || !token1Address) continue;

            const token0Contract = new ethers.Contract(token0Address, ERC20ABI, ethersProvider);
            const token1Contract = new ethers.Contract(token1Address, ERC20ABI, ethersProvider);

            const [symbol0, symbol1, decimals0, decimals1] = await Promise.all([
              token0Contract.symbol().catch(() => "???"),
              token1Contract.symbol().catch(() => "???"),
              token0Contract.decimals().catch(() => 18),
              token1Contract.decimals().catch(() => 18),
            ]);

            pools.push({
              name: `${symbol0} / ${symbol1}`,
              pairAddress,
              token0: token0Address,
              token1: token1Address,
              symbol0,
              symbol1,
              decimals0: Number(decimals0),
              decimals1: Number(decimals1),
            });
          } catch (error) {
            console.warn(`Skipping pair ${i}:`, error);
          }
        }

        setAvailablePools(pools);
        
        // Auto-select pool from URL, or first pool if none selected
        if (pools.length > 0) {
          if (poolFromUrl && pools.some(p => p.name === poolFromUrl)) {
            // Pool from URL exists in the list
            setSelectedPool(poolFromUrl);
          } else if (!selectedPool || !pools.some(p => p.name === selectedPool)) {
            // No valid selection, default to first pool
            setSelectedPool(pools[0].name);
          }
        }
    } catch (error) {
      console.error("Error fetching pools:", error);
    } finally {
      setLoadingPools(false);
    }
  }, [provider, selectedPool]);

  useEffect(() => {
    if (!provider || !FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
      setLoadingPools(false);
      return;
    }
    fetchPools();
  }, [provider, selectedPool, fetchPools]);

  // Smart polling for pools - pauses when tab is hidden
  useSmartPolling(fetchPools, 60000, {
    enabled: !!provider && !!FACTORY_ADDRESS,
    hiddenInterval: 300000, // 5 minutes when hidden
  });

  // Get token addresses based on selected pool
  const selectedPoolInfo = availablePools.find(p => p.name === selectedPool);
  const tokenA = selectedPoolInfo?.token0 || "";
  const tokenB = selectedPoolInfo?.token1 || "";
  const decimalsA = selectedPoolInfo?.decimals0 || 18;
  const decimalsB = selectedPoolInfo?.decimals1 || 18;
  const pairAddress = selectedPoolInfo?.pairAddress || "";

  // Define fetchReserves before its first use
  const fetchReserves = async () => {
    if (!provider || !pairAddress || !account) return;
    try {
      const ethersProvider = provider instanceof ethers.BrowserProvider 
        ? provider 
        : new ethers.BrowserProvider(provider as any);
      const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
      
      const [res0, res1] = await pairContract.getReserves();
      const supply = await pairContract.totalSupply();
      const balance = await pairContract.balanceOf(account);
      
      setReserveA(res0);
      setReserveB(res1);
      setTotalSupply(supply);
      setUserLpBalance(balance);
    } catch (error) {
      console.error("Error fetching reserves:", error);
    }
  };

  // Fetch reserves when pool changes
  useEffect(() => {
    if (provider && pairAddress && pairAddress !== "" && ethers.isAddress(pairAddress) && account && selectedPool) {
      fetchReserves();
    }
  }, [provider, selectedPool, pairAddress, account]);

  // Smart polling for reserves - pauses when tab is hidden
  useSmartPolling(fetchReserves, 60000, {
    enabled: !!provider && !!pairAddress && pairAddress !== "" && ethers.isAddress(pairAddress) && !!account && !!selectedPool,
    hiddenInterval: 300000, // 5 minutes when hidden
  });

  // Calculate implied rate for EURC/REARC pool if it's empty
  useEffect(() => {
    if (provider && selectedPool && selectedPool === "EURC / REARC" && reserveA === 0n && reserveB === 0n) {
      const calculateImplied = async () => {
        const ethersProvider = provider instanceof ethers.BrowserProvider 
          ? provider 
          : new ethers.BrowserProvider(provider as any);
        const rate = await calculateImpliedRate(ethersProvider, decimalsA, decimalsB);
        if (rate !== null) {
          setImpliedRate(ethers.formatUnits(rate, decimalsB));
        } else {
          setImpliedRate(null);
        }
      };
      calculateImplied();
    } else {
      setImpliedRate(null);
    }
  }, [provider, selectedPool, reserveA, reserveB, decimalsA, decimalsB]);

  // Calculate amountB when amountA changes (only if pool has liquidity)
  useEffect(() => {
    if (amountA && reserveA > 0n && reserveB > 0n) {
      const amountAWei = ethers.parseUnits(amountA, decimalsA);
      const requiredB = calculateRequiredAmount(amountAWei, reserveA, reserveB);
      setAmountB(ethers.formatUnits(requiredB, decimalsB));
      calculateLiquidity(amountAWei, requiredB);
    } else if (amountA && reserveA === 0n && reserveB === 0n && impliedRate) {
      // If pool is empty but we have an implied rate, use it
      const amountAWei = ethers.parseUnits(amountA, decimalsA);
      const impliedRateWei = ethers.parseUnits(impliedRate, decimalsB);
      // Calculate: amountB = amountA * impliedRate (adjusted for decimals)
      const amountBWei = (amountAWei * impliedRateWei) / BigInt(10 ** decimalsA);
      setAmountB(ethers.formatUnits(amountBWei, decimalsB));
      calculateLiquidity(amountAWei, amountBWei);
    } else if (!amountA) {
      setAmountB("");
      setEstimatedLiquidity("0");
    }
    // If pool is empty and no implied rate, user can manually enter both amounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountA, reserveA, reserveB, decimalsA, decimalsB, impliedRate]);

  // Calculate liquidity when amountB changes (for empty pools)
  // Note: calculateLiquidity is defined below, so we'll move this useEffect after it

  // Calculate estimated amounts when removing liquidity
  useEffect(() => {
    if (showRemoveMode && removePercentage && provider && pairAddress && totalSupply > 0n && userLpBalance > 0n) {
      const calculateRemove = async () => {
        try {
          const percentage = parseFloat(removePercentage);
          if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
            setEstimatedRemoveA("0");
            setEstimatedRemoveB("0");
            return;
          }
          // Calculate LP amount based on percentage
          const lpAmountWei = (userLpBalance * BigInt(Math.floor(percentage * 100))) / 10000n;
          if (lpAmountWei === 0n || lpAmountWei > userLpBalance) {
            setEstimatedRemoveA("0");
            setEstimatedRemoveB("0");
            return;
          }
          const ethersProvider = provider instanceof ethers.BrowserProvider 
            ? provider 
            : new ethers.BrowserProvider(provider as any);
          const [amount0, amount1] = await getEstimatedRemoveAmounts(ethersProvider, pairAddress, lpAmountWei);
          // Determine which token is which based on pair order
          const token0IsA = tokenA.toLowerCase() < tokenB.toLowerCase();
          setEstimatedRemoveA(ethers.formatUnits(token0IsA ? amount0 : amount1, decimalsA));
          setEstimatedRemoveB(ethers.formatUnits(token0IsA ? amount1 : amount0, decimalsB));
        } catch (error) {
          console.error("Error calculating remove amounts:", error);
          setEstimatedRemoveA("0");
          setEstimatedRemoveB("0");
        }
      };
      calculateRemove();
    } else {
      setEstimatedRemoveA("0");
      setEstimatedRemoveB("0");
    }
  }, [removePercentage, showRemoveMode, provider, pairAddress, totalSupply, userLpBalance, decimalsA, decimalsB, tokenA, tokenB]);

  // Check LP token approval
  useEffect(() => {
    if (showRemoveMode && removePercentage && provider && account && pairAddress && userLpBalance > 0n) {
      const checkLPApproval = async () => {
        try {
          const percentage = parseFloat(removePercentage);
          if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
            setNeedsApprovalLP(false);
            return;
          }
          const lpAmountWei = (userLpBalance * BigInt(Math.floor(percentage * 100))) / 10000n;
          const ethersProvider = provider instanceof ethers.BrowserProvider 
            ? provider 
            : new ethers.BrowserProvider(provider as any);
          const allowance = await checkAllowance(ethersProvider, pairAddress, account, ROUTER_ADDRESS);
          setNeedsApprovalLP(allowance < lpAmountWei);
        } catch (error) {
          console.error("Error checking LP approval:", error);
        }
      };
      checkLPApproval();
    } else {
      setNeedsApprovalLP(false);
    }
  }, [removePercentage, showRemoveMode, provider, account, pairAddress, userLpBalance]);

  // Check approvals when amounts change
  useEffect(() => {
    if (amountA && provider && account && tokenA && tokenB && selectedPool) {
      checkApprovals();
    }
  }, [amountA, amountB, provider, account, tokenA, tokenB, selectedPool]);

  const calculateLiquidity = useCallback(async (amountAWei: bigint, amountBWei: bigint) => {
    if (!provider || !pairAddress) return;
    try {
      const ethersProvider = provider instanceof ethers.BrowserProvider 
        ? provider 
        : new ethers.BrowserProvider(provider as any);
      const liquidity = await getEstimatedLiquidity(ethersProvider, pairAddress, amountAWei, amountBWei);
      setEstimatedLiquidity(ethers.formatUnits(liquidity, 18));
    } catch (error) {
      console.error("Error calculating liquidity:", error);
    }
  }, [provider, pairAddress]);

  // Calculate liquidity when amountB changes (for empty pools)
  useEffect(() => {
    if (amountA && amountB && reserveA === 0n && reserveB === 0n) {
      const amountAWei = ethers.parseUnits(amountA, decimalsA);
      const amountBWei = ethers.parseUnits(amountB, decimalsB);
      calculateLiquidity(amountAWei, amountBWei);
    }
  }, [amountA, amountB, reserveA, reserveB, decimalsA, decimalsB, calculateLiquidity]);

  const checkApprovals = async () => {
    if (!provider || !account || !amountA || !ROUTER_ADDRESS || !tokenA || !tokenB) return;
    try {
      const amountAWei = ethers.parseUnits(amountA, decimalsA);
      const amountBWei = ethers.parseUnits(amountB || "0", decimalsB);
      
      const ethersProvider = provider instanceof ethers.BrowserProvider 
        ? provider 
        : new ethers.BrowserProvider(provider as any);
      
      const [allowanceA, allowanceB] = await Promise.all([
        checkAllowance(ethersProvider, tokenA, account, ROUTER_ADDRESS),
        checkAllowance(ethersProvider, tokenB, account, ROUTER_ADDRESS),
      ]);

      setNeedsApprovalA(allowanceA < amountAWei);
      setNeedsApprovalB(allowanceB < amountBWei);
    } catch (error) {
      console.error("Error checking approvals:", error);
    }
  };

  const handleApproveA = async () => {
    if (!provider || !account) return;
    setLoading(true);
    setError("");
    try {
      const signer = await new ethers.BrowserProvider(provider as any).getSigner();
      await approveToken(signer, tokenA, ROUTER_ADDRESS);
      setNeedsApprovalA(false);
    } catch (error: any) {
      setError(error.message || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveB = async () => {
    if (!provider || !account) return;
    setLoading(true);
    setError("");
    try {
      const signer = await new ethers.BrowserProvider(provider as any).getSigner();
      await approveToken(signer, tokenB, ROUTER_ADDRESS);
      setNeedsApprovalB(false);
    } catch (error: any) {
      setError(error.message || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!provider || !account || !amountA || !amountB) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const signer = await new ethers.BrowserProvider(provider as any).getSigner();
      const amountAWei = ethers.parseUnits(amountA, decimalsA);
      const amountBWei = ethers.parseUnits(amountB, decimalsB);
      
      // Allow 0.1% slippage
      const amountAMin = (amountAWei * 999n) / 1000n;
      const amountBMin = (amountBWei * 999n) / 1000n;

      const tx = await addLiquidity(
        signer,
        tokenA,
        tokenB,
        amountAWei,
        amountBWei,
        amountAMin,
        amountBMin,
        account
      );
      
      await tx.wait();
      setAmountA("");
      setAmountB("");
      setSuccess(`✓ Liquidity added successfully! Received ${estimatedLiquidity} LP tokens.`);
      setTimeout(() => setSuccess(""), 5000);
      fetchReserves();
    } catch (error: any) {
      setError(error.message || "Add liquidity failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!provider || !account || !removePercentage || !pairAddress || userLpBalance === 0n) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const percentage = parseFloat(removePercentage);
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        setError("Invalid percentage");
        setLoading(false);
        return;
      }

      const signer = await new ethers.BrowserProvider(provider as any).getSigner();
      // Calculate LP amount based on percentage
      const lpAmountWei = (userLpBalance * BigInt(Math.floor(percentage * 100))) / 10000n;
      
      if (lpAmountWei === 0n || lpAmountWei > userLpBalance) {
        setError("Invalid amount");
        setLoading(false);
        return;
      }

      // Calculate minimum amounts with 1% slippage tolerance
      const amountAMin = (ethers.parseUnits(estimatedRemoveA, decimalsA) * 99n) / 100n;
      const amountBMin = (ethers.parseUnits(estimatedRemoveB, decimalsB) * 99n) / 100n;

      const tx = await removeLiquidity(
        signer,
        tokenA,
        tokenB,
        lpAmountWei,
        amountAMin,
        amountBMin,
        account
      );
      await tx.wait();
      setRemovePercentage("");
      setEstimatedRemoveA("0");
      setEstimatedRemoveB("0");
      setSuccess(`✓ Liquidity removed successfully! Received ${estimatedRemoveA} ${symbolA} and ${estimatedRemoveB} ${symbolB}.`);
      setTimeout(() => setSuccess(""), 5000);
      fetchReserves();
    } catch (err: any) {
      setError(err.message || "Failed to remove liquidity");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLP = async () => {
    if (!provider || !account || !pairAddress) return;
    setLoading(true);
    setError("");
    try {
      const signer = await new ethers.BrowserProvider(provider as any).getSigner();
      await approveToken(signer, pairAddress, ROUTER_ADDRESS);
      setNeedsApprovalLP(false);
    } catch (err: any) {
      setError(err.message || "LP approval failed");
    } finally {
      setLoading(false);
    }
  };

  const symbolA = selectedPoolInfo?.symbol0 || "???";
  const symbolB = selectedPoolInfo?.symbol1 || "???";
  const exchangeRate = reserveA > 0n && reserveB > 0n 
    ? Number(reserveB) / Number(reserveA) 
    : 1;
  
  // Calculate current pool share (existing LP tokens)
  const currentPoolShare = totalSupply > 0n && userLpBalance > 0n
    ? ((Number(userLpBalance) / Number(totalSupply)) * 100).toFixed(2)
    : "0.00";
  
  // Calculate future pool share (after adding liquidity)
  const futurePoolShare = totalSupply > 0n && parseFloat(estimatedLiquidity) > 0
    ? (((Number(userLpBalance) + parseFloat(estimatedLiquidity) * 1e18) / (Number(totalSupply) + parseFloat(estimatedLiquidity) * 1e18)) * 100).toFixed(2)
    : estimatedLiquidity && parseFloat(estimatedLiquidity) > 0
    ? "100.00" // First liquidity provider gets 100%
    : "0.00";

  if (!account) {
    return (
      <Table style={{ minWidth: '71ch', width: '100%' }}>
        <TableRow>
          <TableColumn colSpan={2}>&nbsp;&nbsp;&nbsp;&nbsp;CONNECT WALLET TO ADD LIQUIDITY</TableColumn>
        </TableRow>
      </Table>
    );
  }

  if (loadingPools) {
    return (
      <Table style={{ minWidth: '71ch', width: '100%' }}>
        <TableRow>
          <TableColumn colSpan={2}>LOADING POOLS...</TableColumn>
        </TableRow>
      </Table>
    );
  }

  if (!selectedPool || availablePools.length === 0) {
    return (
      <Table style={{ minWidth: '71ch', width: '100%' }}>
        <TableRow>
          <TableColumn colSpan={2}>
            {availablePools.length === 0 ? "NO POOLS AVAILABLE - CREATE ONE FIRST" : "SELECT A POOL TO CONTINUE"}
          </TableColumn>
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
          <TableColumn colSpan={2}>
            {loadingPools ? "LOADING POOLS..." : `Pool Pair: (${availablePools.length} available)`}
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn colSpan={2}>
            <Select
              name="pool_pair"
              options={availablePools.map(p => p.name)}
              defaultValue={selectedPool}
              placeholder={loadingPools ? "Loading..." : "Select Pool"}
              onChange={(value) => {
                setSelectedPool(value);
                setAmountA("");
                setAmountB("");
                setRemovePercentage("");
                setShowRemoveMode(false);
              }}
            />
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn style={{ width: '50%' }}>{symbolA} Amount:</TableColumn>
          <TableColumn style={{ width: '50%' }}>{symbolB} Amount:</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn style={{ width: '50%' }}>
            <Input
              label="AMOUNT"
              placeholder="0.00"
              type="number"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
            />
          </TableColumn>
          <TableColumn style={{ width: '50%' }}>
            <Input
              label="AMOUNT"
              placeholder="0.00"
              type="number"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              readOnly={reserveA > 0n && reserveB > 0n}
            />
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>Exchange Rate:</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>
            {reserveA > 0n && reserveB > 0n ? (
              `1 ${symbolA} = ${exchangeRate.toFixed(4)} ${symbolB}`
            ) : impliedRate ? (
              <span>
                1 {symbolA} = {parseFloat(impliedRate).toFixed(4)} {symbolB}
                <br />
                <span style={{ fontSize: '0.9em', color: 'var(--theme-focused-foreground)' }}>
                  (Implied from other pools)
                </span>
              </span>
            ) : (
              `1 ${symbolA} = 0.00 ${symbolB}`
            )}
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>Current Pool Share:</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>{currentPoolShare}%</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>Share After Adding:</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>{futurePoolShare}%</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>LP Tokens to Receive:</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>{parseFloat(estimatedLiquidity).toFixed(6)}</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        {(needsApprovalA || needsApprovalB) && (
          <>
            <TableRow>
              <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
                → APPROVAL REQUIRED: You must approve both tokens before adding liquidity
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
          </>
        )}
        <TableRow>
          <TableColumn>Token Approvals:</TableColumn>
          <TableColumn style={{ textAlign: 'right' }}>
            {needsApprovalA ? `${symbolA}: NOT APPROVED` : `${symbolA}: ✓ APPROVED`}
            {' | '}
            {needsApprovalB ? `${symbolB}: NOT APPROVED` : `${symbolB}: ✓ APPROVED`}
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        {needsApprovalA && (
          <TableRow>
            <TableColumn colSpan={2}>
              <Button onClick={handleApproveA} isDisabled={loading} theme="SECONDARY" style={{ width: '100%' }}>
                {loading ? "APPROVING..." : `1. APPROVE ${symbolA}`}
              </Button>
            </TableColumn>
          </TableRow>
        )}
        {needsApprovalB && (
          <TableRow>
            <TableColumn colSpan={2}>
              <Button onClick={handleApproveB} isDisabled={loading} theme="SECONDARY" style={{ width: '100%' }}>
                {loading ? "APPROVING..." : `${needsApprovalA ? '2' : '1'}. APPROVE ${symbolB}`}
              </Button>
            </TableColumn>
          </TableRow>
        )}
        {(needsApprovalA || needsApprovalB) && (
          <TableRow>
            <TableColumn>&nbsp;</TableColumn>
          </TableRow>
        )}
        <TableRow>
          <TableColumn colSpan={2}>
            <Button
              onClick={handleAddLiquidity}
              isDisabled={loading || !amountA || !amountB || needsApprovalA || needsApprovalB}
              style={{ width: '100%' }}
            >
              {loading ? "ADDING LIQUIDITY..." : needsApprovalA || needsApprovalB ? "ADD LIQUIDITY (APPROVE TOKENS FIRST)" : "ADD LIQUIDITY"}
            </Button>
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn colSpan={2}>
            <Button
              onClick={() => setShowRemoveMode(!showRemoveMode)}
              isDisabled={loading || userLpBalance === 0n}
              theme="SECONDARY"
              style={{ width: '100%' }}
            >
              {showRemoveMode ? "CANCEL REMOVE" : "REMOVE LIQUIDITY"}
            </Button>
          </TableColumn>
        </TableRow>
        {showRemoveMode && userLpBalance > 0n && (
          <>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
                → REMOVE LIQUIDITY MODE
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>Your LP Tokens:</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>
                {ethers.formatUnits(userLpBalance, 18)}
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn colSpan={2}>
                <Input
                  label="PERCENTAGE TO REMOVE"
                  value={removePercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty, numbers, and one decimal point
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      const num = parseFloat(value);
                      if (value === "" || (num >= 0 && num <= 100)) {
                        setRemovePercentage(value);
                      }
                    }
                  }}
                  placeholder="0"
                  type="text"
                />
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn colSpan={2}>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Button
                    onClick={() => setRemovePercentage("25")}
                    theme="SECONDARY"
                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                  >
                    25%
                  </Button>
                  <Button
                    onClick={() => setRemovePercentage("50")}
                    theme="SECONDARY"
                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                  >
                    50%
                  </Button>
                  <Button
                    onClick={() => setRemovePercentage("75")}
                    theme="SECONDARY"
                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                  >
                    75%
                  </Button>
                  <Button
                    onClick={() => setRemovePercentage("100")}
                    theme="SECONDARY"
                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                  >
                    100%
                  </Button>
                </div>
              </TableColumn>
            </TableRow>
            {removePercentage && parseFloat(removePercentage) > 0 && (
              <TableRow>
                <TableColumn>LP Tokens to Remove:</TableColumn>
                <TableColumn style={{ textAlign: 'right' }}>
                  {ethers.formatUnits((userLpBalance * BigInt(Math.floor(parseFloat(removePercentage) * 100))) / 10000n, 18)}
                </TableColumn>
              </TableRow>
            )}
            <TableRow>
              <TableColumn>You will receive:</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn style={{ width: '50%' }}>{symbolA}:</TableColumn>
              <TableColumn style={{ width: '50%', textAlign: 'right' }}>{estimatedRemoveA}</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn style={{ width: '50%' }}>{symbolB}:</TableColumn>
              <TableColumn style={{ width: '50%', textAlign: 'right' }}>{estimatedRemoveB}</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            {needsApprovalLP && (
              <>
                <TableRow>
                  <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
                    → APPROVAL REQUIRED: You must approve LP tokens before removing liquidity
                  </TableColumn>
                </TableRow>
                <TableRow>
                  <TableColumn>&nbsp;</TableColumn>
                </TableRow>
                <TableRow>
                  <TableColumn colSpan={2}>
                    <Button onClick={handleApproveLP} isDisabled={loading} theme="SECONDARY" style={{ width: '100%' }}>
                      {loading ? "APPROVING..." : "APPROVE LP TOKENS"}
                    </Button>
                  </TableColumn>
                </TableRow>
                <TableRow>
                  <TableColumn>&nbsp;</TableColumn>
                </TableRow>
              </>
            )}
            <TableRow>
              <TableColumn colSpan={2}>
                <Button
                  onClick={handleRemoveLiquidity}
                  isDisabled={loading || !removePercentage || needsApprovalLP || parseFloat(removePercentage) <= 0 || parseFloat(removePercentage) > 100}
                  style={{ width: '100%' }}
                >
                  {loading ? "REMOVING LIQUIDITY..." : "REMOVE LIQUIDITY"}
                </Button>
              </TableColumn>
            </TableRow>
          </>
        )}
      </Table>
    </>
  );
}

