# Deploying rearc-frontend to Cloudflare Pages

This guide walks you through deploying the rearc-frontend Next.js 16 application to Cloudflare Pages using static export.

## Prerequisites

- A Cloudflare account (free tier works)
- Your git repository pushed to GitHub, GitLab, or Bitbucket
- Next.js 16 configured for static export (already done in next.config.ts)

## Why Static Export?

Next.js 16 is newer than what `@cloudflare/next-on-pages` currently supports. Instead, we use Next.js's built-in static export feature (`output: 'export'`), which generates a fully static site that works perfectly on Cloudflare Pages.

## Step 1: Set Up Cloudflare Pages via Dashboard

1. **Go to Cloudflare Dashboard**
   - Visit https://dash.cloudflare.com/
   - Navigate to "Workers & Pages" in the sidebar

2. **Create a New Pages Project**
   - Click "Create application"
   - Select "Pages" tab
   - Click "Connect to Git"

3. **Connect Your Repository**
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize Cloudflare to access your repositories
   - Select your `rearc` repository

4. **Configure Build Settings**
   
   Use these exact settings:
   
   - **Project name**: `rearc-frontend` (or your preferred name)
   - **Production branch**: `main` (or your default branch)
   - **Framework preset**: `Next.js (Static HTML Export)`
   - **Root directory**: `rearc-frontend`
   - **Build command**: `next build`
   - **Build output directory**: `out`
   
   > **Important**: The root directory must be set to `rearc-frontend` since your repo contains multiple projects.

5. **Environment Variables**
   
   Add any environment variables your app needs (if any):
   - Click "Add variable"
   - Add variables like API endpoints, contract addresses, etc.

6. **Deploy**
   - Click "Save and Deploy"
   - Cloudflare will build and deploy your application
   - First deployment typically takes 2-5 minutes

## Step 2: Configure Custom Domain (Optional)

1. In your Pages project settings
2. Go to "Custom domains"
3. Add your domain
4. Follow DNS configuration instructions

## Step 3: Environment-Specific Configuration

If you need different configurations for production vs development, create a `.env.production` file in `rearc-frontend/`:

```env
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_FACTORY_ADDRESS=your_factory_address
NEXT_PUBLIC_ROUTER_ADDRESS=your_router_address
NEXT_PUBLIC_NYC1_ADDRESS=your_nyc1_address
NEXT_PUBLIC_REARC_ADDRESS=your_rearc_address
NEXT_PUBLIC_WORKER_URL=https://your-worker.workers.dev
```

Then add these as environment variables in Cloudflare Pages settings.

## Alternative: Deploy via Wrangler CLI

If you prefer command-line deployment:

```bash
# From rearc-frontend directory
cd rearc-frontend

# Build the application
npm run build

# Install wrangler if you haven't already
npm install -g wrangler

# Deploy to Cloudflare Pages
wrangler pages deploy out --project-name=rearc-frontend
```

## Continuous Deployment

Once set up, Cloudflare Pages automatically:
- Deploys on every push to your production branch
- Creates preview deployments for pull requests
- Provides unique URLs for each deployment

## Troubleshooting

### Build Fails

If the build fails:
1. Check the build logs in Cloudflare dashboard
2. Verify the root directory is set to `rearc-frontend`
3. Ensure the build command is `next build` and output directory is `out`
4. Check that all environment variables are set
5. Verify `next.config.ts` has `output: 'export'`

### Runtime Errors

1. Check the "Functions" logs in Cloudflare dashboard
2. Verify your contract addresses are correct
3. Ensure RPC endpoints are accessible

### Worker Integration

Make sure your rearc-worker is deployed separately and update the worker URL in your environment variables.

## Monitoring

- View analytics in Cloudflare Pages dashboard
- Monitor function invocations and errors
- Set up alerts for deployment failures

## Updating Your Deployment

Simply push to your repository - Cloudflare Pages will automatically rebuild and deploy.

For manual deployments:
```bash
npm run build
wrangler pages deploy out --project-name=rearc-frontend
```

## Notes

- Cloudflare Pages has excellent caching and edge distribution
- Your app will be served from Cloudflare's global CDN
- Free tier includes: 500 builds/month, unlimited bandwidth, unlimited requests
- Preview deployments are automatically created for branches and PRs

