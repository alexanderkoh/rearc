# REARC Frontend

Next.js 16 frontend application for REARC.XYZ - AI-Powered AMM on Arc Network.

## Features

- 🪙 Uniswap V2-style AMM for USDC/EURC/REARC trading
- 🤖 AI chat assistant powered by Cloudflare Workers AI
- 💼 MetaMask wallet integration with network switching
- 🎨 Terminal/AS400 inspired UI (SRCL design system)
- ⚡ Built with Next.js 16 and Turbopack
- 📊 Pool management and liquidity operations
- 💰 Balance display for all tokens

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file:

```bash
cp .env.example .env.local  # If you have an example file
```

Add the following environment variables:

```env
# Arc Network Configuration
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network

# Token Addresses
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
NEXT_PUBLIC_REARC_ADDRESS=0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF

# Contract Addresses
NEXT_PUBLIC_FACTORY_ADDRESS=0x400E301d11cEEa405A4f9bb9C62CAcFF54a6822d
NEXT_PUBLIC_ROUTER_ADDRESS=0xFF836D398B32209cE77416A3138780B095b7CF9C

# Pair Addresses
NEXT_PUBLIC_PAIR_USDC_EURC=0xf1075e89Ed4a50cFf98c1A603a134B84160517F1
NEXT_PUBLIC_PAIR_USDC_REARC=0x6bA4968b67Ea8741BFCe0Ac391CA4AdbDf520246
NEXT_PUBLIC_PAIR_EURC_REARC=0xB250E5f6d9ddDeF7822CFE00b9C069b9D86EE2Cb

# Worker URL
NEXT_PUBLIC_WORKER_URL=https://your-worker.workers.dev
```

See `ENV_VARIABLES.md` for complete documentation.

### Development

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Build

```bash
npm run build
```

The static export will be in the `out/` directory.

### Production Preview

```bash
npm run build
npx serve out
```

## Project Structure

```
rearc-frontend/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main menu
│   ├── swap/              # Swap interface
│   ├── liquidity/         # Liquidity management
│   ├── pools/             # Pool information
│   ├── balances/          # Token balances
│   └── chat/              # AI chat assistant
├── components/            # React components
│   ├── SwapInterface.tsx
│   ├── LiquidityInterface.tsx
│   ├── BalanceDisplay.tsx
│   ├── ChatAgent.tsx
│   └── ...                # Other components
├── lib/                   # Utilities and services
│   ├── constants.ts       # Contract addresses and constants
│   ├── swap.ts            # Swap logic
│   ├── liquidity.ts       # Liquidity operations
│   └── dataService.ts     # On-chain data fetching
├── common/                # Shared utilities
│   ├── hooks.ts           # Custom React hooks
│   ├── utilities.ts       # Helper functions
│   └── constants.ts       # Shared constants
└── public/                # Static assets
```

## Pages

- **/** - Main menu with navigation
- **/swap** - Token swap interface
- **/liquidity** - Add/remove liquidity
- **/pools** - View all liquidity pools
- **/balances** - Display token balances
- **/chat** - AI chat assistant

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS, SCSS modules
- **Wallet**: MetaMask SDK, ethers.js v6
- **Design**: SRCL-inspired AS400 terminal aesthetic

## Arc Network Setup

### Add Arc Testnet to MetaMask

1. Open MetaMask
2. Go to Settings → Networks → Add Network
3. Enter:
   - **Network Name**: Arc Testnet
   - **RPC URL**: `https://rpc.testnet.arc.network`
   - **Chain ID**: `5042002`
   - **Currency Symbol**: USDC
   - **Block Explorer**: `https://testnet.arcscan.app`

### Get Test Tokens

- USDC and EURC are available on Arc testnet
- Get REARC tokens from the deployer (see `../GET_REARC_TOKENS.md`)

## Deployment

### Cloudflare Pages

This project is configured for static export and deployment to Cloudflare Pages.

1. **Push to Git** repository
2. **Connect to Cloudflare Pages**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to "Workers & Pages"
   - Create new Pages project
   - Connect your Git repository
3. **Configure build settings**:
   - Root directory: `rearc-frontend`
   - Build command: `next build`
   - Build output directory: `out`
   - Framework preset: Next.js (Static HTML Export)
4. **Add environment variables** (see `ENV_VARIABLES.md`)
5. **Deploy**

See `../CLOUDFLARE_PAGES_DEPLOYMENT.md` for detailed instructions.

### Vercel (Alternative)

The project also includes `vercel.json` for Vercel deployment if preferred.

## Environment Variables

All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

See `ENV_VARIABLES.md` for the complete list of required variables.

## UI Design

The interface is inspired by [SRCL](https://www.sacred.computer/) - Terminal/AS400 aesthetic with excellent UX.

Key design elements:
- Terminal-style monospace fonts
- Green-on-black color scheme
- Retro terminal aesthetic
- Modern UX patterns

## Development Tips

### Hot Reload

Next.js 16 with Turbopack provides fast hot reload during development.

### TypeScript

The project uses strict TypeScript. Check types with:

```bash
npm run type-check  # If you have this script
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Wallet Not Connecting

- Ensure MetaMask is installed
- Check that you're on Arc Testnet (Chain ID: 5042002)
- Verify contract addresses in `.env.local`
- Check browser console for errors

### Swaps Not Working

- Verify you have sufficient token balances
- Check that pools have liquidity
- Verify contract addresses are correct
- Check browser console for transaction errors

### AI Chat Not Responding

- Verify `NEXT_PUBLIC_WORKER_URL` is set correctly
- Check that the worker is deployed and accessible
- Verify CORS is configured on the worker
- Check browser console for network errors

### Build Fails

- Ensure all environment variables are set
- Check that all dependencies are installed
- Verify `next.config.ts` is configured correctly
- Check build logs for specific errors

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MetaMask SDK](https://docs.metamask.io/sdk/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [Arc Network Documentation](https://docs.arc.network/)

## License

See [LICENSE](../LICENSE) file for details.
