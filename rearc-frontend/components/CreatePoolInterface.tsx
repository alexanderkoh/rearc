"use client";

import { useSDK } from "@metamask/sdk-react";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  FACTORY_ADDRESS,
  ROUTER_ADDRESS,
} from "@/lib/constants";
import FactoryABI from "@/lib/abis/Factory.json";
import PairABI from "@/lib/abis/Pair.json";
import ERC20ABI from "@/lib/abis/ERC20.json";
import RouterABI from "@/lib/abis/Router.json";
import Input from "@components/Input";
import Button from "@components/Button";
import Select from "@components/Select";
import Table from "@components/Table";
import TableRow from "@components/TableRow";
import TableColumn from "@components/TableColumn";

interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
}

export default function CreatePoolInterface() {
  const { provider, account } = useSDK();
  const [tokenAAddress, setTokenAAddress] = useState("");
  const [tokenBAddress, setTokenBAddress] = useState("");
  const [tokenAInfo, setTokenAInfo] = useState<TokenInfo | null>(null);
  const [tokenBInfo, setTokenBInfo] = useState<TokenInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);
  const [loadingTokenA, setLoadingTokenA] = useState(false);
  const [loadingTokenB, setLoadingTokenB] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string>("");
  const [pairAddress, setPairAddress] = useState<string>("");
  const [useCustomTokenA, setUseCustomTokenA] = useState(false);
  const [useCustomTokenB, setUseCustomTokenB] = useState(false);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [showLiquidityInputs, setShowLiquidityInputs] = useState(false);

  // Discover all tokens from existing pools
  useEffect(() => {
    if (!provider || !account || !FACTORY_ADDRESS) {
      setAvailableTokens([]);
      setLoadingBalances(false);
      return;
    }

    const fetchAllTokens = async () => {
      setLoadingBalances(true);
      try {
        if (!FACTORY_ADDRESS || !ethers.isAddress(FACTORY_ADDRESS)) {
          setLoadingBalances(false);
          return;
        }
        const ethersProvider = new ethers.BrowserProvider(provider as any);
        const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, ethersProvider);
        const pairsLength = await factoryContract.allPairsLength();

        // Collect all unique token addresses from pools
        const tokenAddressesSet = new Set<string>();

        for (let i = 0; i < pairsLength; i++) {
          try {
            const pairAddress = await factoryContract.allPairs(i).catch(() => null);
            if (!pairAddress || pairAddress === ethers.ZeroAddress) continue;

            const code = await ethersProvider.getCode(pairAddress).catch(() => '0x');
            if (code === '0x' || code.length <= 2) continue;

            const pairContract = new ethers.Contract(pairAddress, PairABI, ethersProvider);
            const token0 = await pairContract.token0().catch(() => null);
            const token1 = await pairContract.token1().catch(() => null);

            if (token0) tokenAddressesSet.add(token0);
            if (token1) tokenAddressesSet.add(token1);
          } catch (err) {
            console.warn(`Error scanning pair ${i}:`, err);
          }
        }

        // Fetch token info and balances for all discovered tokens
        const tokenAddresses = Array.from(tokenAddressesSet);
        const tokenPromises = tokenAddresses.map(async (address) => {
          try {
            const tokenContract = new ethers.Contract(address, ERC20ABI, ethersProvider);
            const [symbol, decimals, balance] = await Promise.all([
              tokenContract.symbol().catch(() => "???"),
              tokenContract.decimals().catch(() => 18),
              tokenContract.balanceOf(account).catch(() => 0n),
            ]);

            // Only include tokens with balance > 0
            if (balance === 0n) return null;

            return {
              address,
              symbol: symbol || "UNKNOWN",
              decimals: Number(decimals),
              balance: ethers.formatUnits(balance, decimals),
            };
          } catch (err) {
            console.warn(`Error fetching token ${address}:`, err);
            return null;
          }
        });

        const tokensWithBalance = (await Promise.all(tokenPromises)).filter((t): t is TokenInfo => t !== null);

        // Sort by symbol for better UX
        tokensWithBalance.sort((a, b) => a.symbol.localeCompare(b.symbol));

        setAvailableTokens(tokensWithBalance);
        
        // Auto-select first two tokens if available and no custom tokens set
        if (tokensWithBalance.length >= 2 && !useCustomTokenA && !useCustomTokenB) {
          if (!tokenAAddress) setTokenAAddress(tokensWithBalance[0].address);
          if (!tokenBAddress) setTokenBAddress(tokensWithBalance[1].address);
        } else if (tokensWithBalance.length === 1 && !useCustomTokenA && !useCustomTokenB) {
          if (!tokenAAddress) setTokenAAddress(tokensWithBalance[0].address);
        }
      } catch (error) {
        console.error("Error fetching known token balances:", error);
      } finally {
        setLoadingBalances(false);
      }
    };

    fetchAllTokens();
    const interval = setInterval(fetchAllTokens, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [provider, account]);

  // Fetch token info when address is entered
  const fetchTokenInfo = async (address: string, setInfo: (info: TokenInfo | null) => void, setLoading: (loading: boolean) => void) => {
    if (!provider || !account || !address) {
      setInfo(null);
      return;
    }

    if (!ethers.isAddress(address)) {
      setInfo(null);
      return;
    }

    setLoading(true);
    try {
      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const tokenContract = new ethers.Contract(address, ERC20ABI, ethersProvider);

      // Fetch token info
      const [symbol, decimals, balance] = await Promise.all([
        tokenContract.symbol().catch(() => "UNKNOWN"),
        tokenContract.decimals().catch(() => 18),
        tokenContract.balanceOf(account),
      ]);

      const formattedBalance = ethers.formatUnits(balance, decimals);

      setInfo({
        address,
        symbol: symbol || "UNKNOWN",
        decimals: Number(decimals),
        balance: formattedBalance,
      });
    } catch (err: any) {
      console.error(`Error fetching token info for ${address}:`, err);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch token A info
  useEffect(() => {
    if (!tokenAAddress || !provider || !account) {
      setTokenAInfo(null);
      return;
    }
    
    // Check if it's in available tokens
    const availableToken = availableTokens.find(t => t.address.toLowerCase() === tokenAAddress.toLowerCase());
    if (availableToken) {
      setTokenAInfo(availableToken);
      return;
    }
    
    // Otherwise fetch it (for custom addresses)
    const timeoutId = setTimeout(() => {
      fetchTokenInfo(tokenAAddress, setTokenAInfo, setLoadingTokenA);
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [tokenAAddress, provider, account, availableTokens]);

  // Fetch token B info
  useEffect(() => {
    if (!tokenBAddress || !provider || !account) {
      setTokenBInfo(null);
      return;
    }
    
    // Check if it's in available tokens
    const availableToken = availableTokens.find(t => t.address.toLowerCase() === tokenBAddress.toLowerCase());
    if (availableToken) {
      setTokenBInfo(availableToken);
      return;
    }
    
    // Otherwise fetch it (for custom addresses)
    const timeoutId = setTimeout(() => {
      fetchTokenInfo(tokenBAddress, setTokenBInfo, setLoadingTokenB);
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [tokenBAddress, provider, account, availableTokens]);

  const handleCreatePool = async () => {
    if (!provider || !account || !FACTORY_ADDRESS || !ROUTER_ADDRESS ||
        !ethers.isAddress(FACTORY_ADDRESS) || !ethers.isAddress(ROUTER_ADDRESS)) {
      setError("Please connect wallet and ensure Factory/Router is configured");
      return;
    }

    if (!tokenAAddress || !tokenBAddress) {
      setError("Please enter both token addresses");
      return;
    }

    if (!ethers.isAddress(tokenAAddress) || !ethers.isAddress(tokenBAddress)) {
      setError("Please enter valid token addresses");
      return;
    }

    if (tokenAAddress.toLowerCase() === tokenBAddress.toLowerCase()) {
      setError("Token A and Token B must be different");
      return;
    }

    if (!tokenAInfo || !tokenBInfo) {
      setError("Please wait for token information to load");
      return;
    }

    // Validate liquidity amounts if provided
    if (amountA && amountB) {
      const amountANum = parseFloat(amountA);
      const amountBNum = parseFloat(amountB);
      if (isNaN(amountANum) || isNaN(amountBNum) || amountANum <= 0 || amountBNum <= 0) {
        setError("Please enter valid liquidity amounts");
        return;
      }
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setPairAddress("");

    try {
      const signer = await new ethers.BrowserProvider(provider as any).getSigner();
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, signer);

      // Check if pair already exists
      const existingPair = await factoryContract.getPair(tokenAAddress, tokenBAddress);

      if (existingPair && existingPair !== ethers.ZeroAddress) {
        setError(`Pool already exists at: ${existingPair}`);
        setPairAddress(existingPair);
        setLoading(false);
        return;
      }

      // Step 1: Create the pair
      setSuccess("Step 1/4: Creating pool...");
      const tx = await factoryContract.createPair(tokenAAddress, tokenBAddress);
      const receipt = await tx.wait();

      // Find the PairCreated event
      const pairCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = factoryContract.interface.parseLog(log);
          return parsed?.name === "PairCreated";
        } catch {
          return false;
        }
      });

      let newPairAddress = "";
      if (pairCreatedEvent) {
        const parsed = factoryContract.interface.parseLog(pairCreatedEvent);
        newPairAddress = parsed?.args[2] || "";
      } else {
        // Fallback: query the factory for the pair address
        newPairAddress = await factoryContract.getPair(tokenAAddress, tokenBAddress);
      }

      setPairAddress(newPairAddress);

      // If liquidity amounts provided, add liquidity
      if (amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0) {
        const amountAWei = ethers.parseUnits(amountA, tokenAInfo.decimals);
        const amountBWei = ethers.parseUnits(amountB, tokenBInfo.decimals);

        const tokenAContract = new ethers.Contract(tokenAAddress, ERC20ABI, signer);
        const tokenBContract = new ethers.Contract(tokenBAddress, ERC20ABI, signer);

        // Step 2: Approve Token A
        setSuccess("Step 2/4: Approving Token A...");
        const allowanceA = await tokenAContract.allowance(account, ROUTER_ADDRESS);
        if (allowanceA < amountAWei) {
          const approvalTxA = await tokenAContract.approve(ROUTER_ADDRESS, ethers.MaxUint256);
          await approvalTxA.wait();
        }

        // Step 3: Approve Token B
        setSuccess("Step 3/4: Approving Token B...");
        const allowanceB = await tokenBContract.allowance(account, ROUTER_ADDRESS);
        if (allowanceB < amountBWei) {
          const approvalTxB = await tokenBContract.approve(ROUTER_ADDRESS, ethers.MaxUint256);
          await approvalTxB.wait();
        }

        // Step 4: Add liquidity
        setSuccess("Step 4/4: Adding initial liquidity...");
        const routerContract = new ethers.Contract(ROUTER_ADDRESS, RouterABI, signer);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

        const liquidityTx = await routerContract.addLiquidity(
          tokenAAddress,
          tokenBAddress,
          amountAWei,
          amountBWei,
          0, // amountAMin (0 for initial liquidity)
          0, // amountBMin (0 for initial liquidity)
          account,
          deadline
        );
        await liquidityTx.wait();

        setSuccess(
          `✓ Pool created and seeded! Added ${amountA} ${tokenAInfo.symbol} and ${amountB} ${tokenBInfo.symbol}.`
        );
      } else {
        setSuccess(
          `✓ Pool created successfully! You can now add initial liquidity to set the price.`
        );
      }
    } catch (err: any) {
      console.error("Error creating pool:", err);
      // Check if user rejected the transaction
      if (err?.code === 'ACTION_REJECTED' || err?.message?.includes("user rejected") || err?.message?.includes("User denied")) {
        setError("Transaction rejected - you declined in MetaMask");
      } else if (err?.message?.includes("PAIR_EXISTS")) {
        setError("This pool already exists");
      } else if (err?.message?.includes("IDENTICAL_ADDRESSES")) {
        setError("Token A and Token B must be different");
      } else {
        setError(err.message || "Failed to create pool");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <Table style={{ minWidth: '71ch', width: '100%' }}>
        <TableRow>
          <TableColumn colSpan={2}>&nbsp;&nbsp;&nbsp;&nbsp;CONNECT WALLET TO CREATE POOL</TableColumn>
        </TableRow>
      </Table>
    );
  }

  if (!FACTORY_ADDRESS) {
    return (
      <Table style={{ minWidth: '71ch', width: '100%' }}>
        <TableRow>
          <TableColumn colSpan={2}>ERROR: Factory address not configured</TableColumn>
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
        <>
          <Table style={{ minWidth: '71ch', width: '100%' }}>
            <TableRow>
              <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
                {success}
              </TableColumn>
            </TableRow>
          </Table>
          <br />
          <Table style={{ minWidth: '71ch', width: '100%' }}>
            <TableRow>
              <TableColumn colSpan={2}>
                <a href="/liquidity" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Button style={{ width: '100%' }}>
                    → ADD INITIAL LIQUIDITY NOW
                  </Button>
                </a>
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn colSpan={2}>
                <a href="/pools" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Button theme="SECONDARY" style={{ width: '100%' }}>
                    VIEW ALL POOLS
                  </Button>
                </a>
              </TableColumn>
            </TableRow>
          </Table>
        </>
      )}
      <Table style={{ minWidth: '71ch', width: '100%' }}>
                <TableRow>
                  <TableColumn colSpan={2}>
                    {loadingBalances ? (
                      "SCANNING POOLS FOR TOKENS..."
                    ) : availableTokens.length > 0 ? (
                      `FOUND ${availableTokens.length} TOKEN${availableTokens.length !== 1 ? 'S' : ''} IN WALLET: ${availableTokens.map(t => t.symbol).join(", ")}`
                    ) : (
                      "NO TOKENS FOUND IN WALLET - ENTER CONTRACT ADDRESS"
                    )}
                  </TableColumn>
                </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn style={{ width: '50%' }}>Token A:</TableColumn>
          <TableColumn style={{ width: '50%' }}>Token B:</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn style={{ width: '50%' }}>
            {!useCustomTokenA && availableTokens.length > 0 ? (
              <Select
                name="token_a"
                options={['[ENTER CUSTOM]', ...availableTokens.map(t => `${t.symbol} — BAL: ${parseFloat(t.balance).toFixed(4)}`)]}
                defaultValue={tokenAInfo && !useCustomTokenA ? `${tokenAInfo.symbol} — BAL: ${parseFloat(tokenAInfo.balance).toFixed(4)}` : ""}
                placeholder="Select Token"
                onChange={(value) => {
                  if (value === '[ENTER CUSTOM]') {
                    setUseCustomTokenA(true);
                    setTokenAAddress("");
                    setTokenAInfo(null);
                  } else {
                    const symbol = value.split(' — BAL:')[0];
                    const selectedToken = availableTokens.find(t => t.symbol === symbol);
                    if (selectedToken) {
                      setTokenAAddress(selectedToken.address);
                      setError("");
                      setSuccess("");
                      setPairAddress("");
                    }
                  }
                }}
              />
            ) : (
              <>
                <Input
                  label="TOKEN ADDRESS"
                  value={tokenAAddress}
                  onChange={(e) => {
                    setTokenAAddress(e.target.value);
                    setError("");
                    setSuccess("");
                    setPairAddress("");
                    setTokenAInfo(null);
                    setUseCustomTokenA(true);
                  }}
                  placeholder="0x..."
                />
                {availableTokens.length > 0 && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--theme-focused-foreground)' }} onClick={() => {
                    setUseCustomTokenA(false);
                    setTokenAAddress(availableTokens[0].address);
                    setTokenAInfo(null);
                  }}>
                    ← BACK TO TOKEN LIST
                  </div>
                )}
              </>
            )}
          </TableColumn>
          <TableColumn style={{ width: '50%' }}>
            {!useCustomTokenB && availableTokens.length > 0 ? (
              <Select
                name="token_b"
                options={['[ENTER CUSTOM]', ...availableTokens.map(t => `${t.symbol} — BAL: ${parseFloat(t.balance).toFixed(4)}`)]}
                defaultValue={tokenBInfo && !useCustomTokenB ? `${tokenBInfo.symbol} — BAL: ${parseFloat(tokenBInfo.balance).toFixed(4)}` : ""}
                placeholder="Select Token"
                onChange={(value) => {
                  if (value === '[ENTER CUSTOM]') {
                    setUseCustomTokenB(true);
                    setTokenBAddress("");
                    setTokenBInfo(null);
                  } else {
                    const symbol = value.split(' — BAL:')[0];
                    const selectedToken = availableTokens.find(t => t.symbol === symbol);
                    if (selectedToken) {
                      setTokenBAddress(selectedToken.address);
                      setError("");
                      setSuccess("");
                      setPairAddress("");
                    }
                  }
                }}
              />
            ) : (
              <>
                <Input
                  label="TOKEN ADDRESS"
                  value={tokenBAddress}
                  onChange={(e) => {
                    setTokenBAddress(e.target.value);
                    setError("");
                    setSuccess("");
                    setPairAddress("");
                    setTokenBInfo(null);
                    setUseCustomTokenB(true);
                  }}
                  placeholder="0x..."
                />
                {availableTokens.length > 0 && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--theme-focused-foreground)' }} onClick={() => {
                    setUseCustomTokenB(false);
                    setTokenBAddress(availableTokens.length > 1 ? availableTokens[1].address : availableTokens[0].address);
                    setTokenBInfo(null);
                  }}>
                    ← BACK TO TOKEN LIST
                  </div>
                )}
              </>
            )}
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        {(loadingTokenA || loadingTokenB) && (
          <TableRow>
            <TableColumn colSpan={2}>→ LOADING TOKEN INFORMATION...</TableColumn>
          </TableRow>
        )}
        {tokenAInfo && tokenBInfo && (
          <>
            <TableRow>
              <TableColumn style={{ width: '50%' }}>
                {tokenAInfo.symbol} ({tokenAInfo.decimals} decimals)
              </TableColumn>
              <TableColumn style={{ width: '50%' }}>
                {tokenBInfo.symbol} ({tokenBInfo.decimals} decimals)
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn style={{ width: '50%' }}>
                Your Balance: {parseFloat(tokenAInfo.balance).toFixed(6)}
              </TableColumn>
              <TableColumn style={{ width: '50%' }}>
                Your Balance: {parseFloat(tokenBInfo.balance).toFixed(6)}
              </TableColumn>
            </TableRow>
            {parseFloat(tokenAInfo.balance) === 0 && parseFloat(tokenBInfo.balance) === 0 && (
              <>
                <TableRow>
                  <TableColumn>&nbsp;</TableColumn>
                </TableRow>
                <TableRow>
                  <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
                    ⚠ WARNING: ZERO BALANCE FOR BOTH TOKENS
                  </TableColumn>
                </TableRow>
                <TableRow>
                  <TableColumn colSpan={2}>
                    You'll need tokens to add liquidity after creating the pool.
                  </TableColumn>
                </TableRow>
              </>
            )}
          </>
        )}
        {tokenAInfo && !tokenBInfo && !loadingTokenB && (
          <TableRow>
            <TableColumn colSpan={2}>
              Token A: {tokenAInfo.symbol} — Balance: {parseFloat(tokenAInfo.balance).toFixed(6)}
            </TableColumn>
          </TableRow>
        )}
        {!tokenAInfo && tokenBInfo && !loadingTokenA && (
          <TableRow>
            <TableColumn colSpan={2}>
              Token B: {tokenBInfo.symbol} — Balance: {parseFloat(tokenBInfo.balance).toFixed(6)}
            </TableColumn>
          </TableRow>
        )}
        {pairAddress && (
          <>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
                → POOL EXISTS AT:
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn colSpan={2} style={{ wordBreak: 'break-all', fontSize: '0.9em' }}>
                {pairAddress}
              </TableColumn>
            </TableRow>
          </>
        )}
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn colSpan={2} style={{ color: 'var(--theme-focused-foreground)' }}>
            INITIAL LIQUIDITY (OPTIONAL - SETS POOL PRICE):
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn style={{ width: '50%' }}>
            <Input
              label={`${tokenAInfo?.symbol || 'TOKEN A'} AMOUNT`}
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="0.00"
              type="number"
            />
          </TableColumn>
          <TableColumn style={{ width: '50%' }}>
            <Input
              label={`${tokenBInfo?.symbol || 'TOKEN B'} AMOUNT`}
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              placeholder="0.00"
              type="number"
            />
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn colSpan={2}>
            {amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0 ? (
              <span>
                Initial Price: 1 {tokenAInfo?.symbol} = {(parseFloat(amountB) / parseFloat(amountA)).toFixed(6)} {tokenBInfo?.symbol}
              </span>
            ) : (
              <span style={{ color: 'var(--theme-muted-foreground)' }}>
                Leave empty to create pool without liquidity (you can add later)
              </span>
            )}
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn>&nbsp;</TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn colSpan={2}>
            <Button
              onClick={handleCreatePool}
              isDisabled={
                loading || 
                !tokenAAddress || 
                !tokenBAddress || 
                !ethers.isAddress(tokenAAddress) || 
                !ethers.isAddress(tokenBAddress) ||
                tokenAAddress.toLowerCase() === tokenBAddress.toLowerCase() ||
                !tokenAInfo ||
                !tokenBInfo ||
                loadingTokenA ||
                loadingTokenB
              }
              style={{ width: '100%' }}
            >
              {loading ? (success || "CREATING POOL...") : amountA && amountB ? "CREATE POOL & ADD LIQUIDITY" : "CREATE POOL"}
            </Button>
          </TableColumn>
        </TableRow>
        <TableRow>
          <TableColumn colSpan={2} style={{ fontSize: '0.9em', color: 'var(--theme-muted-foreground)' }}>
            {amountA && amountB ? (
              "This will execute 4 transactions: create pool, approve token A, approve token B, add liquidity"
            ) : (
              "→ You can add liquidity later from the Liquidity page"
            )}
          </TableColumn>
        </TableRow>
      </Table>
    </>
  );
}

