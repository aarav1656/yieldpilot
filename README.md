# YieldPilot

AI-Powered DeFi Yield Optimizer on Movement Network with x402 Micropayments

## Overview

YieldPilot is a comprehensive DeFi yield optimization platform built for the Movement Network hackathon. It combines AI-driven yield analysis with the x402 micropayment protocol to deliver pay-per-signal premium analytics.

### Features

- AI Yield Signals: Get personalized yield optimization recommendations based on real-time protocol analysis
- Risk Assessment: Comprehensive multi-factor risk scoring for DeFi protocols
- x402 Micropayments: Pay only for the signals you use - no subscriptions
- Real Data Integration: DefiLlama for TVL/yields, Pyth Oracle for price feeds
- Movement Native: Built specifically for Movement Network

## Architecture

```
yieldpilot/
├── contracts/           # Move smart contracts
│   └── sources/
│       └── vault.move   # Vault and strategy contracts
├── server/              # x402 Signal Server (Node.js/Express)
│   └── src/
│       ├── services/
│       │   ├── defillama.ts    # DefiLlama API integration
│       │   ├── pyth.ts         # Pyth Oracle integration
│       │   └── yield-analyzer.ts # AI yield analysis
│       └── index.ts     # Express server with x402 paywall
└── frontend/            # Next.js Frontend
    └── src/
        ├── app/         # Next.js app router
        ├── components/  # React components
        ├── hooks/       # Custom hooks (x402 payment)
        └── lib/         # Utilities and API client
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Movement wallet (Nightly recommended)

### Installation

1. Clone and setup
```bash
cd yieldpilot
```

2. Start the Signal Server
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MOVEMENT_PAY_TO address
npm run dev
```

3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

4. Access the app
- Frontend: http://localhost:3000
- Server: http://localhost:4402

## API Endpoints

### Free Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/protocols` | List Movement protocols |
| `GET /api/movement/tvl` | Movement chain TVL |
| `GET /api/prices/summary` | Basic BTC/ETH prices |
| `GET /api/yields` | Top yield pools |
| `GET /api/pricing` | x402 pricing info |

### Premium Endpoints (x402 Protected)

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/signal/optimal-yield` | 0.01 MOVE | AI yield recommendation |
| `GET /api/analytics/:protocol` | 0.001 MOVE | Protocol analytics |
| `GET /api/risk/assessment` | 0.005 MOVE | Risk assessment |
| `GET /api/prices/live` | 0.0005 MOVE | Real-time Pyth prices |

## Smart Contract

The `vault.move` contract implements:

- VaultConfig: Global vault configuration
- UserPosition: User share tracking
- VaultTreasury: Protocol treasury management
- StrategyAllocation: Multi-strategy support

### Strategies

| ID | Strategy | Description |
|----|----------|-------------|
| 0 | HOLD | Hold assets in vault |
| 1 | ECHELON | Lending on Echelon Market |
| 2 | MOVEPOSITION | Lending on MovePosition |
| 3 | MERIDIAN | LP on Meridian DEX |
| 4 | DIVERSIFIED | Split across protocols |

## Technology Stack

- Blockchain: Movement Network (Aptos-compatible)
- Smart Contracts: Move language
- Backend: Node.js, Express, TypeScript
- Frontend: Next.js 14, React 18, Tailwind CSS
- Data Sources: DefiLlama API, Pyth Network (Hermes)
- Payments: x402 Protocol (x402plus SDK)
- Wallet: Aptos Wallet Adapter (Nightly, Petra, etc.)

## Data Sources

- DefiLlama: Protocol TVL, yield pools, historical data
- Pyth Network: Real-time price feeds via Hermes endpoint
- Movement RPC: On-chain data and transactions

## Deployment

### Move Contracts

```bash
cd contracts
aptos move compile
aptos move publish --named-addresses yieldpilot=<YOUR_ADDRESS>
```

### Server (Production)

```bash
cd server
npm run build
npm start
```

### Frontend (Production)

```bash
cd frontend
npm run build
npm start
```

## Environment Variables

### Server (.env)
```
PORT=4402
MOVEMENT_PAY_TO=<your_wallet_address>
X402_FACILITATOR_URL=https://facilitator.stableyard.fi
```

### Frontend (.env.local)
```
NEXT_PUBLIC_SIGNAL_SERVER_URL=http://localhost:4402
NEXT_PUBLIC_YIELDPILOT_ADDRESS=
```
## License

MIT
