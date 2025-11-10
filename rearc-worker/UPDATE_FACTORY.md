# Update Factory Address in Worker

## Step 1: Find Your Factory Address

Check your `rearc-frontend/.env.local` file for:
```
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
```

Or check the deployment output from when you ran:
```bash
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.network --broadcast
```

## Step 2: Update Worker Code

Open `rearc-worker/src/index.ts` and update line 7:

```typescript
const FACTORY_ADDRESS = "0xYourFactoryAddress"; // Replace with your actual Factory address
```

Change to:
```typescript
const FACTORY_ADDRESS = "0xYourActualFactoryAddressHere";
```

## Step 3: Redeploy

After updating, redeploy the worker:
```bash
cd rearc-worker
npm run deploy
```

## Why This Matters

The Factory address is needed to:
- Discover all liquidity pools dynamically
- Fetch LP token balances for all pools
- Provide complete balance information to the AI

Without it, the AI will only show USDC/EURC/REARC token balances, but won't show LP positions.

