# ClearNode Integration (ERC-7824)

Complete implementation of ERC-7824 Nitrolite protocol for state channel communication with ClearNode.

## Overview

This integration provides:
- ✅ WebSocket connection management with auto-reconnection
- ✅ Full authentication flow (auth_request → auth_challenge → auth_verify)
- ✅ EIP-712 signature support for authentication
- ✅ ECDSA message signing for requests
- ✅ Application session management
- ✅ Type-safe message handling
- ✅ Event-driven architecture

## Architecture

```
ClearNodeService
├── WebSocket Connection
├── Authentication Flow
├── Message Signing (ECDSA + EIP-712)
├── Request/Response Handling
├── Application Sessions
└── Event Emitter
```

## Getting Started

### 1. Configuration

Add to your `.env`:

```env
CLEARNODE_WS_URL=wss://clearnet.yellow.com/ws
CLEARNODE_APP_DOMAIN=liquium.app
CLEARNODE_DOMAIN_NAME=Liquium
PRIVATE_KEY_BACKEND=0x...
```

### 2. Initialize Service

```typescript
import { clearNodeService } from './services/clearnode/ClearNodeService';

// Initialize with private key
await clearNodeService.initialize(process.env.PRIVATE_KEY_BACKEND);

// Set up event listeners
clearNodeService.on('connected', () => {
  console.log('Connected to ClearNode');
});

clearNodeService.on('authenticated', (jwtToken) => {
  console.log('Authenticated with ClearNode');
});

clearNodeService.on('error', (error) => {
  console.error('ClearNode error:', error);
});

// Connect
await clearNodeService.connect();
```

### 3. Create Application Session

```typescript
import { PROTOCOL_CONSTANTS } from '../../config/clearnode';

// Define application session
const appDefinition = {
  protocol: PROTOCOL_CONSTANTS.protocol,
  participants: [dealerAddress, lpAddress],
  weights: [50, 50], // Equal weight
  quorum: 100,
  challenge: 0,
  nonce: Date.now(),
};

const allocations = [
  {
    participant: dealerAddress,
    asset: 'usdc',
    amount: '0',
  },
  {
    participant: lpAddress,
    asset: 'usdc',
    amount: depositAmount.toString(),
  },
];

// Create session
const { app_session_id, status } = await clearNodeService.createAppSession(
  appDefinition,
  allocations
);

console.log('Session created:', app_session_id);
```

### 4. Get Channels

```typescript
const channels = await clearNodeService.getChannels();
console.log('Channels:', channels);
```

### 5. Get Ledger Balances

```typescript
const balances = await clearNodeService.getLedgerBalances(channelId);
console.log('Balances:', balances);
```

## Authentication Flow

The service implements the complete ERC-7824 authentication flow:

```
1. Service Initialized
   ↓
2. WebSocket Connect
   ↓
3. Send auth_request
   ↓
4. Receive auth_challenge (with nonce)
   ↓
5. Sign challenge with EIP-712
   ↓
6. Send auth_verify (with signature)
   ↓
7. Receive auth_success (with JWT token)
   ↓
8. Authenticated! ✅
```

### EIP-712 Signature

The authentication uses EIP-712 structured data signing:

```typescript
{
  types: {
    Policy: [
      { name: 'challenge', type: 'string' },
      { name: 'scope', type: 'string' },
      { name: 'wallet', type: 'address' },
      { name: 'session_key', type: 'address' },
      { name: 'expires_at', type: 'uint64' },
      { name: 'allowances', type: 'Allowance[]' },
    ],
    Allowance: [
      { name: 'asset', type: 'string' },
      { name: 'amount', type: 'string' },
    ],
  },
  domain: {
    name: 'Liquium',
    version: '1',
  },
}
```

## Message Signing

Two types of signing are used:

### 1. ECDSA Signing (Regular Requests)

Used for all non-authentication messages:

```typescript
const messageSigner = createMessageSigner(wallet);
const signature = await messageSigner(requestPayload);
```

**Important:** Signs raw message digest WITHOUT EIP-191 prefix for non-EVM chain compatibility.

### 2. EIP-712 Signing (Authentication Only)

Used only for auth_verify:

```typescript
const signature = await signEIP712AuthMessage(
  wallet,
  domain,
  policyMessage
);
```

## Events

The service emits the following events:

```typescript
clearNodeService.on('connected', () => {
  // WebSocket connection established
});

clearNodeService.on('authenticated', (jwtToken?: string) => {
  // Authentication successful
  // JWT token for reconnection
});

clearNodeService.on('disconnected', ({ code, reason }) => {
  // Connection closed
  // Will auto-reconnect if configured
});

clearNodeService.on('error', (error) => {
  // Error occurred
});

clearNodeService.on('reconnecting', (attempt) => {
  // Attempting to reconnect
});

clearNodeService.on('message', (message) => {
  // Raw message received
});
```

## Reconnection

Automatic reconnection with exponential backoff:

```typescript
{
  maxReconnectAttempts: 5,
  reconnectInterval: 3000, // 3 seconds
  reconnectBackoffMultiplier: 2,
}
```

Delays: 3s → 6s → 12s → 24s → 48s

## Request Timeout

All requests have a 30-second timeout:

```typescript
{
  requestTimeout: 30000, // 30 seconds
}
```

## Connection Status

Check service status:

```typescript
const status = clearNodeService.getStatus();
console.log(status);
// {
//   status: 'authenticated',
//   authenticated: true,
//   address: '0x...'
// }
```

Status values:
- `disconnected`
- `connecting`
- `connected`
- `authenticating`
- `authenticated`
- `error`

## Error Handling

```typescript
try {
  await clearNodeService.connect();
} catch (error) {
  if (error.message.includes('timeout')) {
    // Connection timeout
  } else if (error.message.includes('Authentication failed')) {
    // Auth failed
  }
}
```

## Integration with Nitrolite Service

Example integration in your deal flow:

```typescript
import { clearNodeService } from './clearnode/ClearNodeService';
import { PROTOCOL_CONSTANTS } from '../../config/clearnode';

export class NitroliteService {
  async createChannelForDeal(
    dealId: bigint,
    dealer: Address,
    lp: Address,
    amount: bigint
  ) {
    // Create application session via ClearNode
    const appSession = await clearNodeService.createAppSession(
      {
        protocol: PROTOCOL_CONSTANTS.protocol,
        participants: [dealer, lp],
        weights: [50, 50],
        quorum: 100,
        challenge: 0,
        nonce: Date.now(),
      },
      [
        { participant: dealer, asset: 'usdc', amount: '0' },
        { participant: lp, asset: 'usdc', amount: amount.toString() },
      ]
    );

    // Store app_session_id in database
    await prisma.channelState.create({
      data: {
        channelId: appSession.app_session_id,
        dealId,
        status: appSession.status,
        // ... other fields
      },
    });

    return appSession;
  }
}
```

## Testing

### Prerequisites

1. Create a channel at [apps.yellow.com](https://apps.yellow.com)
2. Set environment variables
3. Ensure backend wallet has session keys

### Manual Test

```typescript
// test-clearnode.ts
import { clearNodeService } from './services/clearnode/ClearNodeService';

async function test() {
  await clearNodeService.initialize(process.env.PRIVATE_KEY_BACKEND);
  
  clearNodeService.on('authenticated', () => {
    console.log('✅ Authentication successful');
  });

  await clearNodeService.connect();
  
  const channels = await clearNodeService.getChannels();
  console.log('Channels:', channels);
}

test().catch(console.error);
```

## Troubleshooting

### Connection Fails

- Check `CLEARNODE_WS_URL` is correct: `wss://clearnet.yellow.com/ws`
- Verify network connectivity
- Check firewall/proxy settings

### Authentication Fails

- Verify `PRIVATE_KEY_BACKEND` is set correctly
- Check wallet has sufficient permissions
- Ensure application domain matches

### Request Timeout

- Check ClearNode service status
- Verify request parameters
- Increase timeout if needed

### WebSocket Closes Unexpectedly

- Check reconnection events
- Verify JWT token validity
- Review ClearNode logs

## API Reference

### ClearNodeService

#### Methods

- `initialize(privateKey: string): Promise<void>`
- `connect(): Promise<void>`
- `disconnect(): void`
- `createAppSession(definition, allocations): Promise<SessionResponse>`
- `getChannels(): Promise<ChannelInfo[]>`
- `getLedgerBalances(channelId): Promise<any>`
- `sendRequest(method, params): Promise<any>`
- `getStatus(): StatusResponse`

#### Events

- `connected`
- `authenticated`
- `disconnected`
- `error`
- `reconnecting`
- `message`

## References

- [ERC-7824 Official Docs](https://erc7824.org)
- [Quick Start Guide](https://erc7824.org/quick_start/)
- [ClearNode Connection Guide](https://erc7824.org/quick_start/connect_to_the_clearnode)
- [Application Sessions Guide](https://erc7824.org/quick_start/application_session)
- [Yellow Network Apps](https://apps.yellow.com)

## License

MIT
