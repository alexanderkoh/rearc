# REARC Contracts

Uniswap V2-style AMM contracts for Arc Network.

This directory contains the smart contracts for REARC.XYZ, including the Factory, Pair, Router, and REARC token contracts.

## Contracts

- **Factory.sol** - Creates and manages liquidity pool pairs
- **Pair.sol** - Uniswap V2-style constant product AMM pair contract
- **Router.sol** - User-friendly interface for swaps and liquidity operations
- **REARC.sol** - ERC20 token contract for REARC token

## Setup

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Install Dependencies

```bash
forge install
```

### 3. Environment Setup

Create a `.env` file in this directory:

```bash
echo "PRIVATE_KEY=your_private_key_here" > .env
```

**⚠️ Security Note**: Never commit your `.env` file. It's already in `.gitignore`.

## Testing

Run all tests:

```bash
forge test -vv
```

Run specific test file:

```bash
forge test --match-path test/AMMTest.t.sol -vv
```

## Deployment

### Deploy to Arc Testnet

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  --verify \
  --etherscan-api-key YOUR_ETHERSCAN_API_KEY
```

This script will:
1. Deploy the REARC token (1M tokens to deployer)
2. Deploy the Factory contract
3. Deploy the Router contract
4. Create three liquidity pools:
   - USDC/EURC
   - USDC/REARC
   - EURC/REARC

### Save Deployment Addresses

After deployment, save the addresses from the output. You'll need them for:
- Frontend configuration (`rearc-frontend/.env.local`)
- Worker configuration (`rearc-worker/src/index.ts`)

## Seeding Pools

After deployment, you can seed the pools with initial liquidity:

```bash
forge script script/SeedPools.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast
```

**Note**: Update the contract addresses in `SeedPools.s.sol` after deployment.

## Arc Network Details

- **Chain ID**: 5042002
- **RPC URL**: `https://rpc.testnet.arc.network`
- **Explorer**: `https://testnet.arcscan.app`
- **Native Token**: USDC
- **USDC Address**: `0x3600000000000000000000000000000000000000`
- **EURC Address**: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`

## Contract Addresses (Deployed)

After deployment, update these addresses in the frontend:

- **REARC Token**: `0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF`
- **Factory**: `0x400E301d11cEEa405A4f9bb9C62CAcFF54a6822d`
- **Router**: `0xFF836D398B32209cE77416A3138780B095b7CF9C`
- **USDC/EURC Pair**: `0xf1075e89Ed4a50cFf98c1A603a134B84160517F1`
- **USDC/REARC Pair**: `0x6bA4968b67Ea8741BFCe0Ac391CA4AdbDf520246`
- **EURC/REARC Pair**: `0xB250E5f6d9ddDeF7822CFE00b9C069b9D86EE2Cb`

View contracts on [Arcscan](https://testnet.arcscan.app)

## Project Structure

```
rearc-contracts/
├── src/
│   ├── Factory.sol      # Factory contract
│   ├── Pair.sol         # Pair contract
│   ├── Router.sol       # Router contract
│   └── REARC.sol        # REARC token contract
├── script/
│   ├── Deploy.s.sol     # Deployment script
│   └── SeedPools.s.sol  # Pool seeding script
├── test/
│   ├── AMMTest.t.sol    # AMM tests
│   └── MockERC20.sol    # Mock token for testing
├── foundry.toml         # Foundry configuration
└── .env                 # Environment variables (not in git)
```

## Development

### Compile Contracts

```bash
forge build
```

### Format Code

```bash
forge fmt
```

### Gas Reports

```bash
forge test --gas-report
```

## Integration

After deployment, update:

1. **Frontend** (`../rearc-frontend/.env.local`):
   - Add all contract addresses
   - See `../rearc-frontend/ENV_VARIABLES.md` for details

2. **Worker** (`../rearc-worker/src/index.ts`):
   - Update `FACTORY_ADDRESS` constant
   - See `../rearc-worker/UPDATE_FACTORY.md` for details

## Troubleshooting

### Deployment Fails

- Ensure you have USDC for gas fees on Arc Network
- Verify RPC URL is correct: `https://rpc.testnet.arc.network`
- Check private key is correct in `.env`
- Verify network is accessible

### Tests Fail

- Run `forge install` to ensure dependencies are installed
- Check that test network is accessible
- Verify mock tokens are deployed correctly

### Verification Fails

- Ensure you have an Etherscan API key
- Check that contracts are deployed successfully
- Verify network supports contract verification

## Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Arc Network Documentation](https://docs.arc.network/)
- [Uniswap V2 Documentation](https://docs.uniswap.org/contracts/v2/overview)

## License

See [LICENSE](../LICENSE) file for details.
