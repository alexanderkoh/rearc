# REARC Contracts
# Uniswap V2-style AMM contracts for Arc Network

## Setup

1. Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
2. Install dependencies: `forge install`
3. Set up environment: Copy `.env.example` to `.env` and add your private key

## Testing

Run tests:
```bash
forge test -vv
```

## Deployment

Deploy to Arc testnet:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://rpc.testnet.arc.network --broadcast --verify
```

## Seeding Pools

After deployment, seed the pools with initial liquidity:
```bash
forge script script/SeedPools.s.sol:SeedPoolsScript --rpc-url https://rpc.testnet.arc.network --broadcast
```

**Note**: Update the contract addresses in `SeedPools.s.sol` after deployment.

## Contract Addresses

After deployment, update these addresses in the frontend `.env.local`:
- Factory: [update after deployment]
- Router: [update after deployment]
- Pair (USDC/EURC): [update after deployment]

## Arc Network Details

- Chain ID: 5042002
- RPC: https://5042002.rpc.thirdweb.com
- Explorer: https://testnet.arcscan.app
- USDC: 0x3600000000000000000000000000000000000000
- EURC: 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a

