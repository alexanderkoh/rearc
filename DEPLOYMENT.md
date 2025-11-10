# REARC.XYZ Deployment Guide

## Prerequisites

1. **Arc Testnet USDC** - You need USDC for gas fees on Arc Network
2. **Private Key** - Wallet private key with USDC balance
3. **Foundry** - Installed and configured
4. **Cloudflare Account** - For deploying the Worker

## Step 1: Deploy Smart Contracts

### 1.1 Setup Environment

```bash
cd rearc-contracts

# Create .env file
echo "PRIVATE_KEY=your_private_key_here" > .env
```

### 1.2 Deploy Contracts

```bash
# Deploy to Arc Testnet
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  --verify \
  --etherscan-api-key YOUR_ETHERSCAN_API_KEY
```

### 1.3 Save Deployment Addresses

After deployment, you'll get:
- REARC Token address
- Factory address
- Router address
- USDC/EURC Pair address
- USDC/REARC Pair address
- EURC/REARC Pair address

**Save these addresses!** You'll need them for the next steps.

## Step 2: Update Frontend Configuration

### 2.1 Update Environment Variables

Edit `rearc-frontend/.env.local`:

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
NEXT_PUBLIC_REARC_ADDRESS=<REARC_TOKEN_ADDRESS>
NEXT_PUBLIC_FACTORY_ADDRESS=<FACTORY_ADDRESS>
NEXT_PUBLIC_ROUTER_ADDRESS=<ROUTER_ADDRESS>
NEXT_PUBLIC_PAIR_USDC_EURC=<USDC_EURC_PAIR_ADDRESS>
NEXT_PUBLIC_PAIR_USDC_REARC=<USDC_REARC_PAIR_ADDRESS>
NEXT_PUBLIC_PAIR_EURC_REARC=<EURC_REARC_PAIR_ADDRESS>
NEXT_PUBLIC_WORKER_URL=<YOUR_CLOUDFLARE_WORKER_URL>
```

### 2.2 Update Constants (if needed)

The constants file will automatically use environment variables, but you can also hardcode them in `rearc-frontend/lib/constants.ts` for development.

## Step 3: Deploy Cloudflare Worker

### 3.1 Update Worker Configuration

Edit `rearc-worker/src/index.ts` and update:
- `PAIR_ADDRESS` (or add support for multiple pairs)
- Any other configuration needed

### 3.2 Deploy Worker

```bash
cd rearc-worker
npm install
npx wrangler deploy
```

### 3.3 Update Worker URL in Frontend

Update `NEXT_PUBLIC_WORKER_URL` in frontend `.env.local` with your deployed worker URL.

## Step 4: Seed Initial Liquidity (Optional)

To make the pools usable, you'll want to add initial liquidity:

1. Get some USDC, EURC, and REARC tokens
2. Use the frontend liquidity page or interact directly with the Router contract
3. Add liquidity to all 3 pools

## Step 5: Verify on Arcscan

1. Visit https://testnet.arcscan.app
2. Verify all deployed contracts
3. Check that all pairs are created correctly

## Step 6: Test Everything

1. **Frontend**: Test wallet connection, network switching
2. **Swap**: Test swaps on all 3 pools
3. **Liquidity**: Test adding/removing liquidity
4. **Chat**: Test AI assistant with on-chain data
5. **Balances**: Verify balance displays correctly

## Troubleshooting

### Contracts Not Deploying
- Ensure you have USDC for gas
- Check RPC URL is correct
- Verify private key is correct

### Frontend Not Connecting
- Check MetaMask is on Arc Testnet (Chain ID: 5042002)
- Verify contract addresses are correct
- Check browser console for errors

### Worker Not Responding
- Verify worker is deployed
- Check CORS headers
- Verify AI binding is configured in `wrangler.jsonc`

## Next Steps After Deployment

1. Add initial liquidity to pools
2. Test all swap paths
3. Test liquidity operations
4. Verify AI chat works with real on-chain data
5. Consider adding more features (price charts, transaction history, etc.)

