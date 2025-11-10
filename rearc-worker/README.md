# REARC Worker

Cloudflare Worker with Workers AI integration for REARC.XYZ chat assistant.

This worker provides an AI-powered chat interface that can query on-chain data and answer questions about token balances, pool information, and trading pairs.

## Features

- 🤖 **AI Integration** - Powered by Cloudflare Workers AI (Llama 3.1 8B)
- 📊 **On-Chain Data** - Fetches token balances and pool information
- 🔍 **Multi-Pool Support** - Queries all liquidity pools via Factory contract
- 🌐 **CORS Enabled** - Configured for frontend integration

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloudflare

Edit `wrangler.jsonc` and add your Cloudflare account details:

```jsonc
{
  "name": "rearc-agent",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "account_id": "your-account-id",
  "ai": {
    "binding": "AI"
  }
}
```

### 3. Update Factory Address

After deploying contracts, update the Factory address in `src/index.ts`:

```typescript
const FACTORY_ADDRESS = "0xYourFactoryAddress";
```

See `UPDATE_FACTORY.md` for detailed instructions.

### 4. Configure RPC URL

The worker uses the Arc Network RPC URL. It's already configured to:
```
https://rpc.testnet.arc.network
```

## Development

### Run Locally

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

### Test Locally

```bash
npm test
```

## Deployment

### Deploy to Cloudflare

```bash
npm run deploy
```

Or using wrangler directly:

```bash
npx wrangler deploy
```

After deployment, you'll get a URL like:
```
https://rearc-agent.your-subdomain.workers.dev
```

### Update Frontend

After deployment, update `NEXT_PUBLIC_WORKER_URL` in the frontend `.env.local`:

```env
NEXT_PUBLIC_WORKER_URL=https://rearc-agent.your-subdomain.workers.dev
```

## API

### POST `/`

Send a POST request with JSON body:

```json
{
  "message": "What is my USDC balance?",
  "address": "0x..."
}
```

**Response**: Plain text AI response

### Example Request

```bash
curl -X POST https://rearc-agent.your-subdomain.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my USDC balance?",
    "address": "0x1234567890123456789012345678901234567890"
  }'
```

## Configuration

### Environment Variables

The worker uses the following configuration:

- **FACTORY_ADDRESS** - Factory contract address (hardcoded in `src/index.ts`)
- **RPC_URL** - Arc Network RPC URL (hardcoded in `src/index.ts`)
- **AI Binding** - Configured in `wrangler.jsonc`

### Update Factory Address

After deploying contracts:

1. Find your Factory address from deployment output
2. Open `src/index.ts`
3. Update line 7:
   ```typescript
   const FACTORY_ADDRESS = "0xYourActualFactoryAddress";
   ```
4. Redeploy: `npm run deploy`

See `UPDATE_FACTORY.md` for detailed instructions.

## How It Works

1. **Receives Request** - POST request with message and wallet address
2. **Fetches On-Chain Data**:
   - Token balances (USDC, EURC, REARC)
   - LP token balances for all pools
   - Pool information via Factory contract
3. **Generates AI Response** - Uses Cloudflare Workers AI to answer questions
4. **Returns Response** - Plain text response to frontend

## Project Structure

```
rearc-worker/
├── src/
│   └── index.ts          # Main worker code
├── test/
│   └── index.spec.ts     # Tests
├── wrangler.jsonc        # Cloudflare configuration
├── package.json
└── tsconfig.json
```

## Troubleshooting

### Worker Not Responding

- Verify worker is deployed: `npx wrangler deployments list`
- Check worker logs: `npx wrangler tail`
- Verify CORS headers are set correctly
- Check that AI binding is configured in `wrangler.jsonc`

### AI Not Working

- Verify Workers AI is enabled in your Cloudflare account
- Check that AI binding is configured in `wrangler.jsonc`
- Verify you have Workers AI access (may require paid plan)

### On-Chain Data Not Fetching

- Verify Factory address is correct
- Check RPC URL is accessible
- Verify network is Arc Testnet
- Check worker logs for RPC errors

### CORS Errors

- Verify CORS headers are set in the worker code
- Check that frontend URL is allowed
- Verify preflight requests are handled

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## License

See [LICENSE](../LICENSE) file for details.
