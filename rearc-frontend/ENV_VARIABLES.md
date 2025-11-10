# Environment Variables for Cloudflare Pages

Add these environment variables in your Cloudflare Pages project settings:

**Settings → Environment variables → Production**

## Required Variables

```bash
# Arc Network Configuration
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network

# Token Addresses
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a

# Your Deployed Token Addresses (from DEPLOYED_ADDRESSES.md)
NEXT_PUBLIC_REARC_ADDRESS=0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF
NEXT_PUBLIC_NYC1_ADDRESS=YOUR_NYC1_TOKEN_ADDRESS_IF_YOU_HAVE_ONE

# Your Deployed Contract Addresses (from DEPLOYED_ADDRESSES.md)
NEXT_PUBLIC_FACTORY_ADDRESS=0x400E301d11cEEa405A4f9bb9C62CAcFF54a6822d
NEXT_PUBLIC_ROUTER_ADDRESS=0xFF836D398B32209cE77416A3138780B095b7CF9C

# Your Deployed Pair Addresses (from DEPLOYED_ADDRESSES.md)
NEXT_PUBLIC_PAIR_USDC_EURC=0xf1075e89Ed4a50cFf98c1A603a134B84160517F1
NEXT_PUBLIC_PAIR_USDC_REARC=0x6bA4968b67Ea8741BFCe0Ac391CA4AdbDf520246
NEXT_PUBLIC_PAIR_EURC_REARC=0xB250E5f6d9ddDeF7822CFE00b9C069b9D86EE2Cb

# Your Deployed Cloudflare Worker URL
# Replace 'your-subdomain' with your actual Cloudflare subdomain
NEXT_PUBLIC_WORKER_URL=https://rearc-agent.your-subdomain.workers.dev
```

## How to Add Variables in Cloudflare Pages

1. Go to your Cloudflare Pages project
2. Click "Settings"
3. Scroll to "Environment variables"
4. Click "Add variable" for each variable above
5. Choose "Production" environment (or both Production and Preview)
6. Click "Save"
7. Redeploy your project for changes to take effect

## Notes

- All variables prefixed with `NEXT_PUBLIC_` will be embedded in the client-side bundle
- Never add private keys or secrets with the `NEXT_PUBLIC_` prefix
- You can set different values for Production vs Preview environments
- After updating variables, trigger a new deployment for changes to take effect

