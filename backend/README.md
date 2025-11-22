# Liquium Backend

Simple Node.js/TypeScript backend for Liquium multi-chain DeFi platform with Nitrolite state channels.

## Stack

- **Node.js 20** + TypeScript
- **Express.js** - REST API
- **PostgreSQL** - Database
- **Prisma** - Database ORM
- **@erc7824/nitrolite** - State channels
- **viem/ethers** - Blockchain interaction

## Quick Start

### 1. Install

```bash
cd backend
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start Database

```bash
npm run docker:up
```

### 4. Initialize Database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Run

```bash
npm run dev
```

Server runs on **http://localhost:3000**

## Project Structure

```
backend/
├── src/
│   ├── config/          # Chain & contract configs
│   ├── services/        # Core services
│   │   ├── nitrolite/   # State channels
│   │   ├── blockchain/  # Smart contracts
│   │   └── database/    # Prisma client
│   ├── api/            # REST endpoints
│   ├── utils/          # Logger, helpers
│   └── index.ts        # Entry point
├── prisma/
│   └── schema.prisma   # Database models
└── docker/
    └── docker-compose.yml  # PostgreSQL only
```

## Database Models

- **Deal** - Trading deals
- **Position** - LP deposits (NFTs)
- **RemoteDeposit** - Cross-chain deposits
- **ChannelState** - Nitrolite states
- **Settlement** - Deal settlements
- **PriceHistory** - FTSO prices

## API Endpoints (Coming Soon)

```
GET  /health            # Health check
GET  /                  # API info

# Deals
POST /api/deals         # Create deal
GET  /api/deals/:id     # Get deal
POST /api/deals/:id/lock    # Lock deal
POST /api/deals/:id/settle  # Settle deal

# Positions
GET  /api/positions/:id     # Get position
POST /api/positions/:id/withdraw  # Withdraw
```

## Scripts

```bash
npm run dev              # Development server
npm run build            # Build TypeScript
npm run start            # Production server

npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Database GUI

npm run docker:up        # Start PostgreSQL
npm run docker:down      # Stop PostgreSQL
```

## Environment Variables

See `.env.example` for all required variables:

- Database connection
- Blockchain RPC URLs
- Contract addresses
- Yellow Network credentials
- Private keys

## Development

The backend is intentionally simple:

- **No Redis** - Direct database queries
- **No job queues** - Synchronous processing
- **No WebSockets** - REST API only
- **Minimal dependencies** - Easy to understand

## Next Steps

1. Install dependencies: `npm install`
2. Configure `.env` file
3. Start database: `npm run docker:up`
4. Run migrations: `npm run prisma:migrate`
5. Start server: `npm run dev`

## License

MIT
