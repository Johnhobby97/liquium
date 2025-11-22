# Liquium Backend API Documentation

Base URL: `http://localhost:3000`

## Overview

The Liquium Backend API provides endpoints for managing DeFi deals with Nitrolite state channels, positions, and FTSO price feeds.

---

## System Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-22T19:00:00.000Z",
  "database": "connected"
}
```

### API Info
```http
GET /
```

**Response:**
```json
{
  "name": "Liquium Backend API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "deals": "/api/deals",
    "positions": "/api/positions",
    "prices": "/api/prices"
  }
}
```

---

## Deal Endpoints

### List Deals
```http
GET /api/deals?status=CREATED&limit=50&offset=0
```

**Query Parameters:**
- `status` (optional): Filter by deal status (CREATED, LOCKED, ACTIVE, SETTLING, SETTLED, CANCELLED)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "deals": [
    {
      "id": "1",
      "depositToken": "0x...",
      "targetToken": "0x...",
      "targetChainId": "114",
      "status": "CREATED",
      "totalDeposited": "1000000",
      "expectedYield": "5.5",
      "dealer": "0x...",
      "createdAt": "2024-11-22T19:00:00.000Z",
      "positions": [],
      "channelState": null
    }
  ]
}
```

### Get Deal
```http
GET /api/deals/:id
```

**Response:**
```json
{
  "success": true,
  "deal": {
    "id": "1",
    "depositToken": "0x...",
    "targetToken": "0x...",
    "status": "LOCKED",
    "totalDeposited": "1000000",
    "expectedYield": "5.5",
    "dealer": "0x...",
    "positions": [...],
    "channelState": {
      "channelId": "0x...",
      "version": "1",
      "intent": "INITIALIZE",
      "allocation0": {...},
      "allocation1": {...}
    },
    "settlements": []
  }
}
```

### Create Deal
```http
POST /api/deals
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": "1",
  "depositToken": "0x...",
  "targetToken": "0x...",
  "targetChainId": "114",
  "expectedYield": "5.5",
  "dealer": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "deal": {...}
}
```

### Lock Deal (Create Channel)
```http
POST /api/deals/:id/lock
```

Creates a Nitrolite state channel for the deal.

**Response:**
```json
{
  "success": true,
  "deal": {...},
  "channelId": "0x...",
  "message": "Deal locked and channel created"
}
```

### Settle Deal (Finalize Channel)
```http
POST /api/deals/:id/settle
Content-Type: application/json
```

**Request Body:**
```json
{
  "finalPrice": "50000",
  "dealerFinal": "1000000",
  "lpFinal": "1050000"
}
```

**Response:**
```json
{
  "success": true,
  "deal": {...},
  "settlement": {...},
  "channelId": "0x..."
}
```

### Get Deal Positions
```http
GET /api/deals/:id/positions
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "positions": [...]
}
```

---

## Position Endpoints

### List Positions
```http
GET /api/positions?owner=0x...&dealId=1&limit=50&offset=0
```

**Query Parameters:**
- `owner` (optional): Filter by position owner address
- `dealId` (optional): Filter by deal ID
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "positions": [
    {
      "id": "1",
      "dealId": "1",
      "owner": "0x...",
      "depositAmount": "100000",
      "tokenAddress": "0x...",
      "chainId": "114",
      "claimed": false,
      "claimAmount": null,
      "createdAt": "2024-11-22T19:00:00.000Z"
    }
  ]
}
```

### Get Position
```http
GET /api/positions/:id
```

**Response:**
```json
{
  "success": true,
  "position": {
    "id": "1",
    "dealId": "1",
    "owner": "0x...",
    "depositAmount": "100000",
    "claimed": false,
    "deal": {...},
    "remoteDeposit": null
  }
}
```

### Create Position (Deposit)
```http
POST /api/positions
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": "1",
  "dealId": "1",
  "owner": "0x...",
  "depositAmount": "100000",
  "tokenAddress": "0x...",
  "chainId": "114"
}
```

**Response:**
```json
{
  "success": true,
  "position": {...}
}
```

### Withdraw Position
```http
POST /api/positions/:id/withdraw
Content-Type: application/json
```

**Request Body:**
```json
{
  "claimAmount": "105000"
}
```

**Response:**
```json
{
  "success": true,
  "position": {...},
  "message": "Withdrawal processed"
}
```

---

## Price Endpoints

### Get Current Price
```http
GET /api/prices/:symbol
```

**Example:** `GET /api/prices/BTC`

**Response:**
```json
{
  "success": true,
  "symbol": "BTC",
  "price": "50000.00",
  "timestamp": "2024-11-22T19:00:00.000Z",
  "source": "FTSO"
}
```

### Get Price History
```http
GET /api/prices/:symbol/history?limit=100&offset=0
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "symbol": "BTC",
  "count": 100,
  "history": [
    {
      "id": "...",
      "tokenSymbol": "BTC",
      "price": "50000.00",
      "source": "FTSO",
      "chainId": "114",
      "timestamp": "2024-11-22T19:00:00.000Z"
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## Features

### ⚡ Yellow/Nitrolite Integration

- **Lock Deal** → Creates Nitrolite state channel
- **Channel States** → Stored in database with full history
- **Settle Deal** → Finalizes channel with final allocations
- **Off-chain Updates** → State updates without gas costs

### 📊 FTSO Price Feeds

- Automatic price fetching every 90 seconds
- Supported symbols: BTC, ETH, FLR, USDC, USDT
- Historical price data stored
- Real-time oracle prices from Flare Network

### 🔒 Security

- Helmet.js security headers
- CORS configuration
- Input validation
- Graceful error handling

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start database:**
   ```bash
   npm run docker:up
   ```

4. **Run migrations:**
   ```bash
   npm run prisma:migrate
   ```

5. **Start server:**
   ```bash
   npm run dev
   ```

6. **Test API:**
   ```bash
   curl http://localhost:3000/health
   ```

---

## Development

- **Hot Reload:** Uses `tsx watch` for automatic restarts
- **Logging:** Winston logger with file + console output
- **Database:** PostgreSQL with Prisma ORM
- **Type Safety:** Full TypeScript support

---

## Example Flow

```bash
# 1. Create deal
curl -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{"id":"1","depositToken":"0x...","targetToken":"0x...","targetChainId":"114","expectedYield":"5.5","dealer":"0x..."}'

# 2. Create position (LP deposit)
curl -X POST http://localhost:3000/api/positions \
  -H "Content-Type: application/json" \
  -d '{"id":"1","dealId":"1","owner":"0x...","depositAmount":"100000","tokenAddress":"0x...","chainId":"114"}'

# 3. Lock deal (create channel)
curl -X POST http://localhost:3000/api/deals/1/lock

# 4. Check deal status
curl http://localhost:3000/api/deals/1

# 5. Get current BTC price
curl http://localhost:3000/api/prices/BTC

# 6. Settle deal (finalize channel)
curl -X POST http://localhost:3000/api/deals/1/settle \
  -H "Content-Type: application/json" \
  -d '{"finalPrice":"50000","dealerFinal":"1000000","lpFinal":"1050000"}'

# 7. Withdraw position
curl -X POST http://localhost:3000/api/positions/1/withdraw \
  -H "Content-Type: application/json" \
  -d '{"claimAmount":"105000"}'
```

---

## Support

For issues or questions:
- Check logs: `tail -f logs/combined.log`
- Database UI: `npm run prisma:studio`
- Health check: `http://localhost:3000/health`
