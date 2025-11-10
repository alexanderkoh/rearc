# AI Chat Setup Guide

This guide will help you set up the AI chat assistant for REARC.XYZ using Cloudflare Workers AI.

## ✅ You Already Have a Worker!

You've already created a worker in Cloudflare dashboard:
- **Worker Name**: `rearc-agent`
- **URL**: `https://rearc-agent.hi-350.workers.dev/`

Great! Now we just need to deploy your code to it.

## Step 1: Install Worker Dependencies

```bash
cd rearc-worker
npm install
```

## Step 2: Authenticate with Cloudflare (if not done)

```bash
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

## Step 3: Test Locally First (Recommended)

Start the worker in development mode:

```bash
cd rearc-worker
npm run dev
```

The worker will be available at `http://localhost:8787`

**Test it:**
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my balance?", "address": "0xYourAddress"}'
```

## Step 4: Deploy to Your Existing Worker

Since you already created `rearc-agent` in the dashboard, just deploy:

```bash
cd rearc-worker
npm run deploy
```

This will deploy your code to the existing `rearc-agent` worker and update it with your AI chat functionality.

## Step 5: Configure Frontend

1. Open `rearc-frontend/.env.local` (create it if it doesn't exist)

2. Add your worker URL:
```bash
NEXT_PUBLIC_WORKER_URL=https://rearc-agent.hi-350.workers.dev
```

**For local development (when testing with `npm run dev`):**
```bash
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
```

3. Restart your Next.js dev server:
```bash
cd rearc-frontend
npm run dev
```

## Step 6: Verify It Works

1. Open your app in the browser
2. Connect your wallet
3. Navigate to "AI Assistant" (Option 5)
4. Send a test message like: "What is my USDC balance?"

## Understanding the Setup

**What you did in Cloudflare Dashboard:**
- Created the worker "container" and got the URL
- This is the right approach! ✅

**What the local code does:**
- Contains your actual AI chat logic
- Fetches on-chain data (balances, reserves)
- Connects to Workers AI
- Handles CORS and requests

**Deploying connects them:**
- `npm run deploy` uploads your code to the existing worker
- Your worker URL stays the same: `https://rearc-agent.hi-350.workers.dev/`
- The worker now has your AI chat functionality

## Troubleshooting

### Worker returns errors
- Check that Workers AI is enabled in your Cloudflare dashboard
- Verify the AI binding is configured (should be automatic)
- Check worker logs: `npx wrangler tail`

### Frontend can't connect
- Verify `NEXT_PUBLIC_WORKER_URL` is set to `https://rearc-agent.hi-350.workers.dev`
- Check browser console for CORS errors
- Ensure worker is deployed: `npm run deploy`

### AI responses are slow
- This is normal for the free tier
- Consider upgrading to Workers Paid plan for better performance

## Current Features

The AI assistant can:
- ✅ Check user token balances (USDC, EURC, REARC)
- ✅ Query pool reserves
- ✅ Calculate exchange rates
- ✅ Answer questions about the AMM
- ✅ Provide swap guidance

## Production Checklist

- [x] Worker created in Cloudflare dashboard
- [ ] Worker dependencies installed (`npm install`)
- [ ] Tested locally (`npm run dev`)
- [ ] Deployed to Cloudflare (`npm run deploy`)
- [ ] Worker URL added to `.env.local`
- [ ] Tested with connected wallet
- [ ] Verified AI responses are accurate

## Support

If you encounter issues:
1. Check Cloudflare dashboard → Workers → rearc-agent → Logs
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test worker directly: `curl -X POST https://rearc-agent.hi-350.workers.dev -H "Content-Type: application/json" -d '{"message":"test","address":"0x..."}'`
