# REARC.XYZ

**AI-Powered Automated Market Maker (AMM) on Arc Network**

REARC.XYZ is a Uniswap V2-style Constant Product AMM integrated with an AI chat assistant, built on the Arc Network. The platform features a retro AS400 terminal aesthetic interface and enables seamless token swaps between USDC and EURC stablecoins.

**[Live Demo](https://rearc.xyz)** (Coming Soon)

## Features

- 🔄 **Uniswap V2-style AMM** - Constant product formula (xy = k) with 0.3% trading fee
- 🤖 **AI Chat Assistant** - Powered by Cloudflare Workers AI using Llama 3.1 8B
- 💰 **USDC/EURC Trading Pair** - Stablecoin swaps on Arc Network
- 🎨 **AS400 Terminal UI** - Retro terminal aesthetic inspired by SRCL design system
- 🔗 **MetaMask Integration** - Seamless wallet connectivity and network switching
- 📊 **Pool Management** - View liquidity pools and add/remove liquidity
- ⚡ **Arc Network** - Built on EVM-compatible Layer-1 with USDC as native gas token

## Project Structure

```
rearc/
├── rearc-frontend/     # Next.js 16 frontend application
├── rearc-contracts/    # Solidity smart contracts (Foundry)
└── rearc-worker/       # Cloudflare Workers AI backend
```

## Getting Started

### Frontend

```sh
cd rearc-frontend
npm install
npm run dev
```

Go to `http://localhost:3000` in your browser.

### Smart Contracts

```sh
cd rearc-contracts
forge install
forge test
forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast
```

### Cloudflare Worker

```sh
cd rearc-worker
npm install
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, MetaMask SDK
- **Smart Contracts**: Solidity, Foundry
- **Backend**: Cloudflare Workers AI (Llama 3.1 8B)
- **Blockchain**: Arc Network (Chain ID: 5042002)
- **Design System**: SRCL-inspired AS400 terminal aesthetic

## Network Configuration

- **Network**: Arc Testnet
- **Chain ID**: 5042002
- **RPC URL**: `https://rpc.testnet.arc.network`
- **Explorer**: `https://testnet.arcscan.app`
- **Native Token**: USDC
- **Trading Pair**: USDC/EURC

## License

See [LICENSE](LICENSE) file for details.

## Contact

For questions or support, please open an issue on GitHub.

