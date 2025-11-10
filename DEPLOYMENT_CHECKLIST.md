# Cloudflare Pages Deployment Checklist

Quick checklist to get your frontend deployed to Cloudflare Pages.

## Pre-Deployment Setup

### 1. Verify Configuration
- ✅ `next.config.ts` updated for Cloudflare with static export (already done)
- ✅ Next.js 16 is fully compatible with Cloudflare Pages static export

### 2. Push to Git
Make sure your latest changes are committed and pushed:
```bash
cd /Users/atl4s/Developer/rearc
git add .
git commit -m "Prepare for Cloudflare Pages deployment"
git push origin main
```

## Cloudflare Dashboard Setup

### 3. Create Pages Project
1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages**
3. Click **Create application** → **Pages** tab
4. Click **Connect to Git**

### 4. Connect Repository
1. Authorize Cloudflare with your Git provider
2. Select your `rearc` repository
3. Click **Begin setup**

### 5. Configure Build Settings
Use these **EXACT** settings:

| Setting | Value |
|---------|-------|
| **Project name** | `rearc-frontend` (or your choice) |
| **Production branch** | `main` |
| **Framework preset** | Next.js (Static HTML Export) |
| **Root directory** | `rearc-frontend` ⚠️ IMPORTANT |
| **Build command** | `next build` |
| **Build output directory** | `out` |

### 6. Add Environment Variables
Click **"Environment variables"** and add all variables from `rearc-frontend/ENV_VARIABLES.md`:

**Copy these directly:**
```
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
NEXT_PUBLIC_REARC_ADDRESS=0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF
NEXT_PUBLIC_FACTORY_ADDRESS=0x400E301d11cEEa405A4f9bb9C62CAcFF54a6822d
NEXT_PUBLIC_ROUTER_ADDRESS=0xFF836D398B32209cE77416A3138780B095b7CF9C
NEXT_PUBLIC_PAIR_USDC_EURC=0xf1075e89Ed4a50cFf98c1A603a134B84160517F1
NEXT_PUBLIC_PAIR_USDC_REARC=0x6bA4968b67Ea8741BFCe0Ac391CA4AdbDf520246
NEXT_PUBLIC_PAIR_EURC_REARC=0xB250E5f6d9ddDeF7822CFE00b9C069b9D86EE2Cb
```

**Update this with your actual worker URL:**
```
NEXT_PUBLIC_WORKER_URL=https://rearc-agent.YOUR-SUBDOMAIN.workers.dev
```

### 7. Deploy
1. Click **Save and Deploy**
2. Wait 2-5 minutes for build to complete
3. You'll get a URL like: `https://rearc-frontend.pages.dev`

## Post-Deployment

### 8. Test Your Deployment
Visit your deployment URL and verify:
- [ ] Site loads correctly
- [ ] Can connect MetaMask wallet
- [ ] Can view pools and balances
- [ ] Swap interface works

### 9. Set Up Custom Domain (Optional)
1. In Pages project → **Custom domains**
2. Add your domain
3. Configure DNS as instructed

## Troubleshooting

### Build Failed?
- Check build logs in Cloudflare dashboard
- Verify root directory is set to `rearc-frontend`
- Ensure all dependencies are in `package.json`

### Runtime Errors?
- Check Functions logs in Cloudflare dashboard  
- Verify all environment variables are set correctly
- Confirm your worker is deployed and URL is correct

### Need to Redeploy?
Just push to your git repo - automatic deployment!

Or manually:
```bash
cd rearc-frontend
npm run build
npx wrangler pages deploy out --project-name=rearc-frontend
```

## Useful Commands

```bash
# Build for production locally
npm run build

# Test the build locally
npx serve out

# Manual deployment (requires wrangler)
npm install -g wrangler
wrangler pages deploy out --project-name=rearc-frontend

# View deployment logs
wrangler pages deployment list --project-name=rearc-frontend
```

## Resources
- Full deployment guide: `CLOUDFLARE_PAGES_DEPLOYMENT.md`
- Environment variables: `rearc-frontend/ENV_VARIABLES.md`
- Contract addresses: `DEPLOYED_ADDRESSES.md`
- Worker setup: `rearc-worker/README.md`

---

**Need Help?**
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- Next.js on Pages: https://developers.cloudflare.com/pages/framework-guides/nextjs/

