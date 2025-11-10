# REARC.XYZ

**AI-Powered AMM on Arc Network**

REARC.XYZ is a Uniswap V2-style Constant Product AMM integrated with an AI chat assistant on the Arc Network. Built with Next.js 16, TypeScript, Tailwind CSS, and Cloudflare Workers AI.

## Features

- 🪙 Uniswap V2-style AMM for USDC/EURC trading
- 🤖 AI chat assistant powered by Cloudflare Workers AI
- 💼 MetaMask wallet integration
- 🎨 Terminal/AS/400 inspired UI (SRCL design system)
- ⚡ Built with Next.js 16 and Turbopack

## Project Structure

- `rearc-frontend/` - Next.js frontend application
- `rearc-contracts/` - Foundry smart contracts (Factory, Pair, Router)
- `rearc-worker/` - Cloudflare Worker with AI integration

## Quick Start

### Frontend

```bash
cd rearc-frontend
npm install
cp .env.example .env.local
# Update .env.local with your configuration
npm run dev
```

Visit `http://localhost:3000`

### Contracts

```bash
cd rearc-contracts
# Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup
forge test
```

### Worker

```bash
cd rearc-worker
npm install
npm run dev
```

## Arc Network Setup

1. Add Arc Testnet to MetaMask:
   - Chain ID: 5042002
   - RPC: https://5042002.rpc.thirdweb.com
   - Explorer: https://testnet.arcscan.app

2. Get test tokens from Circle's testnet faucet

3. Deploy contracts (see `rearc-contracts/README.md`)

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Worker (Cloudflare)

```bash
cd rearc-worker
npm run deploy
```

## UI Design

Inspired by [SRCL](https://www.sacred.computer/) - Terminal/AS/400 aesthetic with excellent UX.

## License

MIT
