// Arc Network Configuration
export const ARC_CHAIN_ID = 5042002;
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
export const ARC_EXPLORER_URL = "https://testnet.arcscan.app";

// Token Addresses
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000";
export const EURC_ADDRESS = process.env.NEXT_PUBLIC_EURC_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
export const REARC_ADDRESS = process.env.NEXT_PUBLIC_REARC_ADDRESS || ""; // Update after deployment
export const NYC1_ADDRESS = process.env.NEXT_PUBLIC_NYC1_ADDRESS || ""; // Update after deployment

// Token Decimals
export const USDC_DECIMALS = 6;
export const EURC_DECIMALS = 6;
export const REARC_DECIMALS = 18;
export const NYC1_DECIMALS = 18;

// Contract Addresses (update after deployment)
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "";
export const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_ROUTER_ADDRESS || "";

// Pair Addresses (update after deployment)
export const PAIR_USDC_EURC = process.env.NEXT_PUBLIC_PAIR_USDC_EURC || "";
export const PAIR_USDC_REARC = process.env.NEXT_PUBLIC_PAIR_USDC_REARC || "";
export const PAIR_EURC_REARC = process.env.NEXT_PUBLIC_PAIR_EURC_REARC || "";

// Legacy: Default to USDC/EURC pair for backward compatibility
export const PAIR_ADDRESS = PAIR_USDC_EURC;

// Arc Network Configuration for MetaMask
export const ARC_NETWORK = {
  chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
  chainName: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: [ARC_RPC_URL],
  blockExplorerUrls: [ARC_EXPLORER_URL],
};

// Worker URL
export const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";

