# Liquium Frontend

Next.js 15 application for the Liquium cross-chain deal vaults platform.

## Features

- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 🔗 **Web3 Integration** - RainbowKit + Wagmi for wallet connections
- ⚡ **Fast Development** - Next.js 15 App Router with hot reload
- 🎯 **Type-Safe** - Full TypeScript support
- 🌈 **Beautiful Gradients** - Purple/blue DeFi aesthetic
- 📡 **Real-time Data** - Polling-based updates from backend API

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Web3:** Wagmi 2.x + Viem 2.x
- **Wallet:** RainbowKit
- **State:** TanStack Query (React Query)
- **HTTP:** Axios

## Getting Started

### Prerequisites

- Node.js 20+
- Backend API running on `http://localhost:3000`

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your values
```

### Environment Variables

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Flare Network
NEXT_PUBLIC_FLARE_CHAIN_ID=114
NEXT_PUBLIC_FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc

# Contract Addresses (from deployment)
NEXT_PUBLIC_DEAL_VAULT_ADDRESS=0x51324081c6483E6170379289a0A3CCC161835b39
NEXT_PUBLIC_DEAL_POSITION_ADDRESS=0x45f61bAD7e29a6FB9ec307daD7B895e63Db1940B
NEXT_PUBLIC_YELLOW_CHANNEL_ADDRESS=0x332355fcd8Ae1c4Ff9F8926Ca73CdDaF3871269c

# WalletConnect (optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

### Development

```bash
npx prisma generate

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

The app will be available at `http://localhost:3001`

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── providers.tsx       # Web3 providers
│   │   ├── globals.css         # Global styles
│   │   ├── deals/
│   │   │   ├── page.tsx        # Deals list
│   │   │   └── [id]/           # Deal details (TODO)
│   │   └── positions/
│   │       └── page.tsx        # My positions
│   ├── components/
│   │   └── Header.tsx          # Navigation header
│   ├── lib/
│   │   ├── wagmi.ts            # Wagmi configuration
│   │   ├── api.ts              # Backend API client
│   │   ├── contracts.ts        # Contract ABIs & addresses
│   │   └── utils.ts            # Helper functions
│   ├── hooks/                  # Custom React hooks (TODO)
│   └── types/                  # TypeScript types
├── public/                     # Static assets
├── .env.example                # Environment template
├── next.config.mjs             # Next.js config
├── tailwind.config.ts          # Tailwind config
└── tsconfig.json               # TypeScript config
```

## Pages

### Home (`/`)
- Hero section with project overview
- Key features showcase
- Stats dashboard (TVL, active deals, LPs)
- Call-to-action buttons

### Deals (`/deals`)
- List of all deals
- Filter by status (Created, Locked, Active, Settled)
- Deal cards with key metrics
- Link to deal details

### Positions (`/positions`)
- User's LP positions
- Deposit amounts and claim status
- Claim rewards functionality
- Link back to deals

## API Integration

The frontend connects to the backend API:

```typescript
// List deals
GET /api/deals?status=CREATED&limit=50

// Get deal details
GET /api/deals/:id

// List user positions
GET /api/positions?owner=0x...

// Get FTSO prices
GET /api/prices/:symbol
```

## Wallet Integration

Supports desktop wallets via RainbowKit:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow
- And more...

Connected to **Flare Coston2 Testnet** (Chain ID: 114)

## Smart Contract Interactions

The frontend reads from and writes to:

- **DealVault** - Deposit & claim functions
- **DealPosition** - NFT balance & ownership
- **ERC20 Tokens** - Balances & approvals

## Styling

Uses Tailwind CSS with custom theme:

- **Primary:** Blue (#0ea5e9)
- **Secondary:** Purple (#a855f7)
- **Background:** Dark gradient (gray-900 to black)
- **Accents:** Purple/blue gradients

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow Next.js best practices
- Use 'use client' directive for client components
- Keep components small and focused

### API Calls
- Use the `api` client from `@/lib/api`
- Handle loading & error states
- Show user-friendly messages

### Wallet Interactions
- Always check if wallet is connected
- Handle transaction errors gracefully
- Show transaction status to users

## TODO / Future Enhancements

- [ ] Deal details page with deposit form
- [ ] Real claim functionality with contract calls
- [ ] Transaction status notifications
- [ ] Price charts using FTSO data
- [ ] Analytics page with Octav integration
- [ ] Deal creation UI (admin)
- [ ] Mobile optimization
- [ ] Dark/light mode toggle
- [ ] Transaction history
- [ ] APY calculators

## Troubleshooting

### Wallet won't connect
- Ensure you're on Flare Coston2 testnet
- Try switching networks in your wallet
- Clear cache and reload

### API errors
- Check backend is running on port 3000
- Verify NEXT_PUBLIC_API_URL is correct
- Check browser console for errors

### Build errors
- Run `npm install` again
- Delete `.next` folder and rebuild
- Check all environment variables are set

## Support

For issues or questions:
- Check backend API logs
- Review browser console
- Ensure contracts are deployed

## License

MIT
