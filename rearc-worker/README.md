# REARC.XYZ Worker
# Cloudflare Worker with Workers AI integration

## Setup

1. Install dependencies: `npm install`
2. Configure `wrangler.jsonc` with your Cloudflare account details
3. Set up Workers AI binding (configured in wrangler.jsonc)

## Development

Run locally:
```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

## Deployment

Deploy to Cloudflare:
```bash
npm run deploy
```

## Environment Variables

Update `PAIR_ADDRESS` in `src/index.ts` after deploying contracts.

## API

POST `/` with JSON body:
```json
{
  "message": "What is my USDC balance?",
  "address": "0x..."
}
```

Response: Plain text AI response

