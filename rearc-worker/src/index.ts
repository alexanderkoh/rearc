/**
 * REARC.XYZ Cloudflare Worker
 * AI-powered chat assistant for the AMM dApp
 */

const ARC_RPC_URL = "https://rpc.testnet.arc.network";
const FACTORY_ADDRESS = "0x400E301d11cEEa405A4f9bb9C62CAcFF54a6822d";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
const REARC_ADDRESS = "0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF";
const NYC1_ADDRESS = "0xb8d0b1014d6926ad80e23ad630e36473d4118e2b"; // Add if you have NYC1 deployed

// ERC20 ABI function selectors
const ERC20_BALANCE_OF_ABI = "0x70a08231"; // balanceOf(address)
const ERC20_SYMBOL_ABI = "0x95d89b41"; // symbol()
const ERC20_DECIMALS_ABI = "0x313ce567"; // decimals()

// Pair ABI function selectors
const PAIR_GET_RESERVES_ABI = "0x0902f1ac"; // getReserves()
const PAIR_TOKEN0_ABI = "0x0dfe1681"; // token0()
const PAIR_TOKEN1_ABI = "0xd21220a7"; // token1()
const PAIR_BALANCE_OF_ABI = "0x70a08231"; // balanceOf(address) - same as ERC20

// Factory ABI function selectors
const FACTORY_ALL_PAIRS_LENGTH_ABI = "0x574f2ba3"; // allPairsLength()
const FACTORY_ALL_PAIRS_ABI = "0x1e3dd18b"; // allPairs(uint256)

async function rpcCall(to: string, data: string): Promise<string> {
  const response = await fetch(ARC_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to: to,
          data: data,
        },
        "latest",
      ],
    }),
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.result;
}

async function fetchBalanceOf(tokenAddress: string, userAddress: string): Promise<string> {
  const data = ERC20_BALANCE_OF_ABI + userAddress.slice(2).padStart(64, "0");
  return rpcCall(tokenAddress, data);
}

async function fetchSymbol(tokenAddress: string): Promise<string> {
  // Check known tokens first (case-insensitive)
  const addrLower = tokenAddress.toLowerCase();
  if (addrLower === USDC_ADDRESS.toLowerCase()) return "USDC";
  if (addrLower === EURC_ADDRESS.toLowerCase()) return "EURC";
  if (addrLower === REARC_ADDRESS.toLowerCase()) return "REARC";
  if (NYC1_ADDRESS && addrLower === NYC1_ADDRESS.toLowerCase()) return "NYC1";
  
  try {
    const result = await rpcCall(tokenAddress, ERC20_SYMBOL_ABI);
    if (!result || result === "0x" || result.length < 130) return "UNKNOWN";
    
    // Decode string from hex ABI encoding
    // Format for return value: [offset (32 bytes)][length (32 bytes)][string data (padded to 32 bytes)]
    const data = result.slice(2); // Remove 0x prefix
    
    // First 64 hex chars = 32 bytes = offset (usually 0x20 = 32, pointing to length)
    const offsetHex = data.slice(0, 64);
    const offset = parseInt(offsetHex, 16);
    
    // Length is at the offset position (usually at hex char 64-128)
    const lengthHex = data.slice(offset * 2, offset * 2 + 64);
    const length = parseInt(lengthHex, 16);
    
    if (length === 0 || length > 32 || isNaN(length)) return "UNKNOWN";
    
    // String data starts after length (at offset + 32 bytes = offset + 64 hex chars)
    const stringStart = (offset + 32) * 2; // Convert bytes to hex chars
    const stringHex = data.slice(stringStart, stringStart + length * 2);
    
    if (!stringHex || stringHex.length === 0) return "UNKNOWN";
    
    // Convert hex to string
    let symbol = "";
    for (let i = 0; i < stringHex.length; i += 2) {
      const charCode = parseInt(stringHex.slice(i, i + 2), 16);
      if (charCode > 0) {
        symbol += String.fromCharCode(charCode);
      }
    }
    
    return symbol.trim() || "UNKNOWN";
  } catch (err) {
    // If symbol() fails, return UNKNOWN
    return "UNKNOWN";
  }
}

async function fetchDecimals(tokenAddress: string): Promise<number> {
  try {
    const result = await rpcCall(tokenAddress, ERC20_DECIMALS_ABI);
    return parseInt(result, 16);
  } catch {
    return 18; // Default to 18 decimals
  }
}

async function fetchToken0(pairAddress: string): Promise<string> {
  const result = await rpcCall(pairAddress, PAIR_TOKEN0_ABI);
  return "0x" + result.slice(-40);
}

async function fetchToken1(pairAddress: string): Promise<string> {
  const result = await rpcCall(pairAddress, PAIR_TOKEN1_ABI);
  return "0x" + result.slice(-40);
}

async function fetchAllPairsLength(): Promise<number> {
  if (!FACTORY_ADDRESS || FACTORY_ADDRESS === "0xYourFactoryAddress") {
    return 0;
  }
  try {
    const result = await rpcCall(FACTORY_ADDRESS, FACTORY_ALL_PAIRS_LENGTH_ABI);
    return parseInt(result, 16);
  } catch {
    return 0;
  }
}

async function fetchAllPairs(index: number): Promise<string | null> {
  if (!FACTORY_ADDRESS || FACTORY_ADDRESS === "0xYourFactoryAddress") {
    return null;
  }
  try {
    const indexHex = index.toString(16).padStart(64, "0");
    const data = FACTORY_ALL_PAIRS_ABI + indexHex;
    const result = await rpcCall(FACTORY_ADDRESS, data);
    const address = "0x" + result.slice(-40);
    return address === "0x0000000000000000000000000000000000000000" ? null : address;
  } catch {
    return null;
  }
}

async function fetchReserves(pairAddress: string): Promise<[string, string]> {
  const response = await fetch(ARC_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to: pairAddress,
          data: PAIR_GET_RESERVES_ABI,
        },
        "latest",
      ],
    }),
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message);
  }

  // Decode reserves from hex (first 32 bytes = reserve0, next 32 bytes = reserve1)
  const data = result.result.slice(2);
  const reserve0 = "0x" + data.slice(0, 64);
  const reserve1 = "0x" + data.slice(64, 128);
  return [reserve0, reserve1];
}

function formatBalance(balanceHex: string, decimals: number): string {
  const balance = BigInt(balanceHex);
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, "0")}`;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const reqData = await request.json();
      const userMsg = reqData.message || "";
      const userAddr = reqData.address || "";
      const conversationHistory = reqData.history || []; // Array of { role: "user" | "assistant", content: string }

      let chainDataText = "";
      try {
        if (userAddr) {
          // Step 1: Discover all tokens from Factory pools
          const allTokenAddresses = new Set<string>();
          
          // Helper to normalize addresses (lowercase) to avoid duplicates
          const normalizeAddress = (addr: string) => addr.toLowerCase();
          
          // Add known tokens first (normalized)
          allTokenAddresses.add(normalizeAddress(USDC_ADDRESS));
          allTokenAddresses.add(normalizeAddress(EURC_ADDRESS));
          if (REARC_ADDRESS) allTokenAddresses.add(normalizeAddress(REARC_ADDRESS));
          if (NYC1_ADDRESS) allTokenAddresses.add(normalizeAddress(NYC1_ADDRESS));

          // Discover tokens from all pools via Factory
          if (FACTORY_ADDRESS) {
            try {
              const pairsLength = await fetchAllPairsLength();
              for (let i = 0; i < pairsLength; i++) {
                try {
                  const pairAddress = await fetchAllPairs(i);
                  if (!pairAddress) continue;

                  // Check if contract exists
                  const codeResult = await fetch(ARC_RPC_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      jsonrpc: "2.0",
                      id: 1,
                      method: "eth_getCode",
                      params: [pairAddress, "latest"],
                    }),
                  });
                  const codeData = await codeResult.json();
                  if (!codeData.result || codeData.result === "0x") continue;

                  // Get token addresses from pair (normalized to avoid duplicates)
                  const token0Address = await fetchToken0(pairAddress);
                  const token1Address = await fetchToken1(pairAddress);
                  
                  if (token0Address) allTokenAddresses.add(normalizeAddress(token0Address));
                  if (token1Address) allTokenAddresses.add(normalizeAddress(token1Address));
                } catch (err) {
                  // Skip failed pairs
                }
              }
            } catch (err) {
              // If Factory query fails, continue with known tokens
            }
          }

          // Step 2: Fetch balances and metadata for all discovered tokens
          const tokenBalances: { symbol: string; balance: string; decimals: number; address: string }[] = [];
          const allTokensMetadataMap = new Map<string, { symbol: string; address: string }>(); // Use Map to avoid duplicates
          
          const tokenPromises = Array.from(allTokenAddresses).map(async (tokenAddress) => {
            try {
              const [balanceHex, symbol, decimals] = await Promise.all([
                fetchBalanceOf(tokenAddress, userAddr),
                fetchSymbol(tokenAddress),
                fetchDecimals(tokenAddress),
              ]);
              
              const tokenSymbol = symbol || "UNKNOWN";
              const normalizedAddr = normalizeAddress(tokenAddress);
              
              // Always add to metadata (all discovered tokens) - Map prevents duplicates
              if (!allTokensMetadataMap.has(normalizedAddr)) {
                allTokensMetadataMap.set(normalizedAddr, {
                  symbol: tokenSymbol,
                  address: tokenAddress,
                });
              }
              
              const balance = formatBalance(balanceHex, decimals);
              if (parseFloat(balance) > 0) {
                return {
                  symbol: tokenSymbol,
                  balance,
                  decimals,
                  address: tokenAddress,
                };
              }
              return null;
            } catch (err) {
              // Even if balance fetch fails, try to get symbol for metadata
              const normalizedAddr = normalizeAddress(tokenAddress);
              if (!allTokensMetadataMap.has(normalizedAddr)) {
                try {
                  const symbol = await fetchSymbol(tokenAddress);
                  allTokensMetadataMap.set(normalizedAddr, {
                    symbol: symbol || "UNKNOWN",
                    address: tokenAddress,
                  });
                } catch {
                  // Skip if we can't get symbol
                }
              }
              return null;
            }
          });

          const results = await Promise.all(tokenPromises);
          results.forEach((result) => {
            if (result) tokenBalances.push(result);
          });
          
          // Convert Map to array for final output
          const allTokensMetadata = Array.from(allTokensMetadataMap.values());

          // Fetch all LP token balances from Factory
          const lpPositions: { pool: string; balance: string }[] = [];
          
          if (FACTORY_ADDRESS) {
            const pairsLength = await fetchAllPairsLength();
            
            for (let i = 0; i < pairsLength; i++) {
              try {
                const pairAddress = await fetchAllPairs(i);
                if (!pairAddress) continue;

                // Check if contract exists
                const codeResult = await fetch(ARC_RPC_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "eth_getCode",
                    params: [pairAddress, "latest"],
                  }),
                });
                const codeData = await codeResult.json();
                if (!codeData.result || codeData.result === "0x") continue;

                // Get LP balance
                const lpBalanceData = PAIR_BALANCE_OF_ABI + userAddr.slice(2).padStart(64, "0");
                const lpBalanceHex = await rpcCall(pairAddress, lpBalanceData);
                const lpBalance = formatBalance(lpBalanceHex, 18);
                
                if (parseFloat(lpBalance) > 0) {
                  // Get token symbols
                  const token0Address = await fetchToken0(pairAddress);
                  const token1Address = await fetchToken1(pairAddress);
                  const symbol0 = await fetchSymbol(token0Address);
                  const symbol1 = await fetchSymbol(token1Address);
                  
                  lpPositions.push({
                    pool: `${symbol0}/${symbol1}`,
                    balance: lpBalance,
                  });
                }
              } catch (err) {
                // Skip failed pairs
              }
            }
          }

          // Step 3: Build comprehensive balance text with all token info
          let balanceText = `The user's wallet address is ${userAddr}. `;
          
          if (tokenBalances.length > 0) {
            balanceText += `Token balances: `;
            balanceText += tokenBalances.map(t => `${t.balance} ${t.symbol} (${t.address})`).join(", ");
            balanceText += ". ";
          } else {
            balanceText += "The user has no token balances. ";
          }

          if (lpPositions.length > 0) {
            balanceText += `Liquidity Provider (LP) positions: `;
            balanceText += lpPositions.map(lp => `${lp.balance} ${lp.pool} LP tokens`).join(", ");
            balanceText += ". ";
          } else {
            balanceText += "The user has no LP positions. ";
          }

          // Add list of ALL available tokens in the system (not just ones with balances)
          if (allTokensMetadata.length > 0) {
            balanceText += `Available tokens in the system (all tokens that exist in pools): ${allTokensMetadata.map(t => `${t.symbol} (${t.address})`).join(", ")}. `;
          }

          chainDataText = balanceText;
        } else {
          chainDataText = "On-chain data is currently unavailable. Please provide a wallet address.";
        }
      } catch (err) {
        chainDataText = `(On-chain data fetch failed: ${err instanceof Error ? err.message : "Unknown error"})`;
      }

      // Build conversation history context
      let historyContext = "";
      if (conversationHistory.length > 0) {
        historyContext = "\n\nPrevious conversation:\n";
        conversationHistory.forEach((msg: { role: string; content: string }, index: number) => {
          const roleLabel = msg.role === "user" ? "User" : "Assistant";
          historyContext += `${roleLabel}: ${msg.content}\n`;
        });
        historyContext += "\n";
      }

      const prompt = `You are an AI assistant for REARC.XYZ, a decentralized exchange (AMM) on Arc Network.

${chainDataText}${historyContext}

The user can swap tokens, add/remove liquidity, and create new pools. You should:
- Answer questions about their token balances and LP positions accurately using the chain data above
- Help them understand swap mechanics and liquidity provision
- Provide guidance on using the swap and liquidity interfaces
- Be concise, helpful, and accurate about their actual balances
- When asked about specific tokens, reference the token addresses and balances from the chain data above
- Use conversation history to provide context-aware responses and follow up on previous questions

IMPORTANT: 
- When the user asks about their balances or LP tokens, provide the exact information from the chain data above
- If a token is mentioned in the chain data (with its address), you can provide information about it
- Do not make assumptions or say they don't have balances if the data shows they do
- All token information comes from on-chain queries - you have access to all tokens that exist in pools on this AMM
- Remember previous conversation context when answering follow-up questions

User: ${userMsg}
Assistant:`;

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt: prompt,
      });

      let answer = "";
      if (aiResponse && typeof aiResponse === "object" && "response" in aiResponse) {
        answer = String(aiResponse.response);
      } else if (typeof aiResponse === "string") {
        answer = aiResponse;
      } else {
        answer = JSON.stringify(aiResponse);
      }

      return new Response(answer, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain",
        },
      });
    } catch (error) {
      return new Response(`Error processing request: ${error instanceof Error ? error.message : "Unknown error"}`, {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain",
        },
      });
    }
	},
} satisfies ExportedHandler<Env>;
