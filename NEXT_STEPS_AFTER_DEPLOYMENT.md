# Next Steps After Deployment

## ✅ Deployment Complete!

All contracts have been successfully deployed to Arc Testnet. Here's what to do next:

## 1. Verify Contracts on Arcscan

Visit these links to view your deployed contracts:

- **REARC Token**: https://testnet.arcscan.app/address/0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF
- **Factory**: https://testnet.arcscan.app/address/0x400E301d11cEEa405A4f9bb9C62CAcFF54a6822d
- **Router**: https://testnet.arcscan.app/address/0xFF836D398B32209cE77416A3138780B095b7CF9C
- **USDC/EURC Pair**: https://testnet.arcscan.app/address/0xf1075e89Ed4a50cFf98c1A603a134B84160517F1
- **USDC/REARC Pair**: https://testnet.arcscan.app/address/0x6bA4968b67Ea8741BFCe0Ac391CA4AdbDf520246
- **EURC/REARC Pair**: https://testnet.arcscan.app/address/0xB250E5f6d9ddDeF7822CFE00b9C069b9D86EE2Cb

## 2. Update Frontend Configuration

### Create `.env.local` file:

```bash
cd rearc-frontend
cp .env.example .env.local
```

The `.env.local` file should already have all the correct addresses. Just update the `NEXT_PUBLIC_WORKER_URL` after deploying the Cloudflare Worker.

## 3. Update Worker Configuration

The worker has been updated with the pair addresses. Deploy it:

```bash
cd rearc-worker
npm install
npx wrangler deploy
```

After deployment, update `NEXT_PUBLIC_WORKER_URL` in frontend `.env.local` with your worker URL.

## 4. Test the Frontend

```bash
cd rearc-frontend
npm install
npm run dev
```

Then:
1. Open http://localhost:3000
2. Connect your MetaMask wallet
3. Switch to Arc Testnet (Chain ID: 5042002)
4. Test viewing balances
5. Test the swap interface
6. Test the AI chat assistant

## 5. Add Initial Liquidity (Optional)

To make the pools usable, you'll want to add some initial liquidity:

1. Get some USDC, EURC, and REARC tokens
2. Use the frontend liquidity page or interact directly with the Router contract
3. Add liquidity to all 3 pools

### Example: Add Liquidity via Router

You can use the Router contract directly or through the frontend. The Router address is:
`0xFF836D398B32209cE77416A3138780B095b7CF9C`

## 6. Test Swaps

Once you have liquidity in the pools:
1. Test swaps on all 3 pools
2. Verify the constant product formula is working
3. Check that fees are being collected correctly

## 7. Verify Everything Works

- ✅ Wallet connection
- ✅ Network switching
- ✅ Balance display
- ✅ Swap functionality
- ✅ Liquidity addition/removal
- ✅ AI chat with on-chain data
- ✅ All 3 pools accessible

## 📝 Contract Addresses Summary

All addresses are saved in `DEPLOYED_ADDRESSES.md` for reference.

## 🔗 Quick Links

- **Arcscan Explorer**: https://testnet.arcscan.app
- **Arc RPC**: https://rpc.testnet.arc.network
- **Chain ID**: 5042002

## 🎉 You're Ready!

Your AMM is now live on Arc Testnet! Users can:
- Swap tokens on all 3 pools
- Add/remove liquidity
- Use the AI assistant to get help with swaps and balances

