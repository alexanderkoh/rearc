# How to Get REARC Tokens

The REARC token was deployed to your deployer address with 1,000,000 tokens. To use them in the UI, you need to transfer some to your MetaMask wallet.

## Option 1: Transfer via MetaMask (Easiest)

1. **Get your deployer address**:
   - The address that deployed the contracts has all 1M REARC tokens
   - You can find it in your deployment logs or check the REARC token contract on Arcscan

2. **Import the deployer wallet to MetaMask**:
   - Open MetaMask
   - Click the account menu (three dots)
   - Select "Import Account"
   - Enter your private key (the one you used for deployment)
   - This will add the deployer wallet as a new account

3. **Transfer REARC tokens**:
   - Switch to the deployer account in MetaMask
   - Go to the REARC token contract: https://testnet.arcscan.app/address/0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF
   - Click "Write Contract" or use MetaMask to send tokens
   - Transfer some REARC tokens to your main MetaMask wallet address

## Option 2: Use Arcscan to Transfer

1. Visit the REARC token contract: https://testnet.arcscan.app/address/0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF
2. Connect your deployer wallet
3. Use the `transfer` function to send tokens to your MetaMask address

## Option 3: Use Foundry Cast (Command Line)

```bash
cd rearc-contracts

# Transfer 1000 REARC tokens (adjust amount as needed)
cast send 0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF \
  "transfer(address,uint256)" \
  YOUR_METAMASK_ADDRESS \
  $(cast --to-wei 1000 ether) \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key YOUR_DEPLOYER_PRIVATE_KEY
```

Replace:
- `YOUR_METAMASK_ADDRESS` with your MetaMask wallet address
- `YOUR_DEPLOYER_PRIVATE_KEY` with your deployer private key
- `1000` with the amount you want to transfer

## REARC Token Details

- **Address**: `0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF`
- **Decimals**: 18
- **Total Supply**: 1,000,000 REARC
- **Initial Holder**: Your deployer address

## After Transferring

Once you have REARC tokens in your MetaMask wallet:
1. The balance will show up in the BalanceDisplay component
2. You can add liquidity to USDC/REARC and EURC/REARC pools
3. You can swap REARC tokens on the swap page

