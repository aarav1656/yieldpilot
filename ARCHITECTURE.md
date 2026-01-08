# YieldPilot Architecture

## System Overview Diagram

```mermaid
flowchart TB
    subgraph User["👤 User"]
        Wallet[("Nightly/Petra Wallet")]
    end

    subgraph Frontend["Frontend (Next.js)"]
        UI[Dashboard UI]
        WalletAdapter[Aptos Wallet Adapter]
        X402Hook[x402 Payment Hook]
    end

    subgraph SignalServer["x402 Signal Server (Express)"]
        Paywall[x402 Paywall Middleware]
        YieldAnalyzer[AI Yield Analyzer]

        subgraph DataServices["Data Services"]
            DefiLlama[DefiLlama Client]
            PythClient[Pyth Oracle Client]
        end

        subgraph Endpoints["API Endpoints"]
            FreeAPI[Free Endpoints<br/>- /protocols<br/>- /movement/tvl<br/>- /prices/summary]
            PremiumAPI[Premium Endpoints<br/>- /signal/optimal-yield<br/>- /risk/assessment<br/>- /analytics/:protocol]
        end
    end

    subgraph ExternalAPIs["External Data Sources"]
        DefiLlamaAPI[(DefiLlama API)]
        PythNetwork[(Pyth Network<br/>Hermes)]
    end

    subgraph Movement["Movement Network (Testnet)"]
        VaultContract[Vault Smart Contract<br/>0xff4a...9c04]
        Treasury[(Vault Treasury)]
        UserPositions[(User Positions)]
    end

    subgraph X402["x402 Protocol"]
        Facilitator[x402 Facilitator<br/>stableyard.fi]
    end

    %% User interactions
    Wallet --> WalletAdapter
    WalletAdapter --> UI
    UI --> X402Hook

    %% Frontend to Server
    X402Hook -->|"HTTP + X-PAYMENT header"| Paywall
    UI -->|"Free API calls"| FreeAPI

    %% Paywall flow
    Paywall -->|"402 Payment Required"| X402Hook
    Paywall -->|"Verify Payment"| Facilitator
    Paywall -->|"Access Granted"| PremiumAPI

    %% Server internal
    PremiumAPI --> YieldAnalyzer
    YieldAnalyzer --> DefiLlama
    YieldAnalyzer --> PythClient

    %% External API calls
    DefiLlama -->|"TVL, Yields"| DefiLlamaAPI
    PythClient -->|"Real-time Prices"| PythNetwork

    %% Blockchain interactions
    WalletAdapter -->|"deposit/withdraw"| VaultContract
    VaultContract --> Treasury
    VaultContract --> UserPositions
    X402Hook -->|"MOVE Payment"| Movement

    %% Styling
    classDef primary fill:#FFD700,stroke:#000,color:#000
    classDef secondary fill:#1a1a1a,stroke:#FFD700,color:#fff
    classDef external fill:#2d2d2d,stroke:#666,color:#fff

    class Wallet,VaultContract primary
    class UI,Paywall,YieldAnalyzer secondary
    class DefiLlamaAPI,PythNetwork,Facilitator external
```

---

## x402 Payment Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend
    participant S as Signal Server
    participant X as x402 Facilitator
    participant M as Movement Network

    U->>F: Click "Get Yield Signal"
    F->>S: GET /api/signal/optimal-yield
    S->>S: Check X-PAYMENT header
    S-->>F: 402 Payment Required<br/>(WWW-Authenticate: x402)

    F->>F: Parse payment requirements
    F->>U: Show payment prompt<br/>"Pay 0.01 MOVE"
    U->>F: Approve payment

    F->>M: Submit MOVE transfer
    M-->>F: Transaction hash

    F->>S: GET /api/signal/optimal-yield<br/>(X-PAYMENT: {txHash, amount})
    S->>X: Verify payment
    X-->>S: Payment confirmed

    S->>S: Generate yield signal
    S-->>F: 200 OK + Signal data
    F->>U: Display AI recommendation
```

---

## Smart Contract Structure

```mermaid
classDiagram
    class VaultConfig {
        +address admin
        +address fee_recipient
        +u64 total_assets
        +u64 total_shares
        +u8 current_strategy
        +u64 performance_fee_bps
        +u64 management_fee_bps
        +u64 high_water_mark
        +u64 last_harvest
        +u64 accrued_fees
        +bool is_shutdown
    }

    class UserPosition {
        +u64 shares
        +u64 deposit_timestamp
        +u64 total_deposited
        +u64 total_withdrawn
    }

    class VaultTreasury {
        +Coin~AptosCoin~ coins
    }

    class StrategyAllocation {
        +u8 strategy_id
        +u64 allocation_bps
        +u64 last_updated
    }

    VaultConfig "1" --> "*" UserPosition : tracks
    VaultConfig "1" --> "1" VaultTreasury : manages
    VaultConfig "1" --> "*" StrategyAllocation : contains

    class Strategies {
        <<enumeration>>
        HOLD = 0
        ECHELON = 1
        MOVEPOSITION = 2
        MERIDIAN = 3
        DIVERSIFIED = 4
    }
```

---

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph External["External Data"]
        DL[DefiLlama]
        PY[Pyth Oracle]
    end

    subgraph Processing["Signal Server"]
        DC[DefiLlama Client<br/>1min cache]
        PC[Pyth Client<br/>5sec cache]
        YA[Yield Analyzer]
    end

    subgraph Analysis["AI Analysis"]
        RA[Risk Assessment]
        YO[Yield Optimization]
        MA[Market Analysis]
    end

    subgraph Output["Signals"]
        OS[Optimal Strategy]
        RP[Risk Profile]
        AA[Allocation Advice]
    end

    DL -->|"TVL, APY, Pools"| DC
    PY -->|"BTC, ETH, SOL prices"| PC

    DC --> YA
    PC --> YA

    YA --> RA
    YA --> YO
    YA --> MA

    RA --> RP
    YO --> OS
    MA --> AA
```

---

## Component Diagram

```mermaid
flowchart TB
    subgraph Frontend["Frontend Package"]
        direction TB
        App[app/page.tsx]
        Dashboard[components/dashboard.tsx]
        Wallet[components/connect-wallet.tsx]
        WalletModal[components/wallet-selection-modal.tsx]
        X402[hooks/use-x402-payment.ts]
        API[lib/api.ts]
        Movement[lib/movement.ts]
    end

    subgraph Server["Server Package"]
        direction TB
        Index[index.ts]
        Types[types.ts]
        DLClient[services/defillama.ts]
        PyClient[services/pyth.ts]
        Analyzer[services/yield-analyzer.ts]
    end

    subgraph Contracts["Move Contracts"]
        direction TB
        Vault[vault.move]
    end

    App --> Dashboard
    Dashboard --> Wallet
    Dashboard --> X402
    Wallet --> WalletModal
    X402 --> API
    API --> Movement

    Index --> Types
    Index --> DLClient
    Index --> PyClient
    Index --> Analyzer
    Analyzer --> DLClient
    Analyzer --> PyClient
```

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Development["Local Development"]
        FE_DEV[Frontend<br/>localhost:3000]
        BE_DEV[Server<br/>localhost:4402]
    end

    subgraph Production["Production (Future)"]
        FE_PROD[Frontend<br/>Vercel]
        BE_PROD[Server<br/>Railway/Fly.io]
    end

    subgraph Blockchain["Movement Network"]
        TESTNET[Testnet<br/>testnet.movementnetwork.xyz]
        MAINNET[Mainnet<br/>mainnet.movementnetwork.xyz]
    end

    subgraph External["External Services"]
        LLAMA[api.llama.fi]
        HERMES[hermes.pyth.network]
        X402F[facilitator.stableyard.fi]
    end

    FE_DEV --> BE_DEV
    FE_PROD --> BE_PROD

    BE_DEV --> TESTNET
    BE_PROD --> MAINNET

    BE_DEV --> LLAMA
    BE_DEV --> HERMES
    BE_DEV --> X402F

    BE_PROD --> LLAMA
    BE_PROD --> HERMES
    BE_PROD --> X402F
```

---

## API Endpoint Map

```mermaid
flowchart LR
    subgraph Free["Free Tier (No Payment)"]
        F1[GET /health]
        F2[GET /api/protocols]
        F3[GET /api/movement/tvl]
        F4[GET /api/prices/summary]
        F5[GET /api/yields]
        F6[GET /api/pricing]
    end

    subgraph Premium["Premium Tier (x402)"]
        P1["GET /api/signal/optimal-yield<br/>💰 0.01 MOVE"]
        P2["GET /api/analytics/:protocol<br/>💰 0.001 MOVE"]
        P3["GET /api/risk/assessment<br/>💰 0.005 MOVE"]
        P4["GET /api/prices/live<br/>💰 0.0005 MOVE"]
    end

    Client[Client Request] --> Router{x402 Paywall}
    Router -->|"No auth needed"| Free
    Router -->|"Payment required"| Premium

    Premium -->|"402 if no payment"| PaymentFlow[Payment Flow]
    Premium -->|"200 if paid"| DataResponse[Data Response]
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 | React framework with App Router |
| | Tailwind CSS | Styling |
| | Aptos Wallet Adapter | Wallet connection |
| | Radix UI | Accessible components |
| **Backend** | Express.js | HTTP server |
| | TypeScript | Type safety |
| | x402plus | Micropayment paywall |
| **Blockchain** | Move | Smart contract language |
| | Movement Testnet | Deployment target |
| **Data** | DefiLlama API | TVL and yield data |
| | Pyth Network | Real-time price oracles |
| **Payments** | x402 Protocol | HTTP micropayments |
| | Stableyard Facilitator | Payment verification |

---

## Key Contract Addresses

| Component | Address | Network |
|-----------|---------|---------|
| YieldPilot Vault | `0xff4abeaf7290a4b229adab98cfd7ad2e4505511aea944a83b495148daffd9c04` | Movement Testnet |
| AptosCoin | `0x1::aptos_coin::AptosCoin` | Native |
| x402 Facilitator | `facilitator.stableyard.fi` | HTTPS |
