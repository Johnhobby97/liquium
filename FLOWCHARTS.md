# Liquium - Multi-Chain Yield Aggregation Protocol

> Cross-chain LP token aggregation with Yellow Network, LayerZero, and Flare integration

---

## 🎯 System Overview

Liquium enables **cross-chain yield aggregation** where:
- Partners create deals on **Flare Network** with incentive structures
- Users deposit LP tokens from **any blockchain**
- Funds are bridged to Flare via **Yellow Network** (or LayerZero fallback)
- Rewards are claimed daily and credited to **Yellow virtual balances**
- Users withdraw to their **original source chain**
- Backend orchestration runs on **Fluence DePIN**
- Price data from **Flare FTSO oracles**

---

## 🏗️ Complete Architecture

```mermaid
graph TB
    subgraph "User's Source Chain Any EVM Chain"
        User[User Wallet]
        LP[LP Token Contract]
        LZ[LayerZero Endpoint]
    end

    subgraph "Yellow Network Layer 2 State Channels"
        YChannel[Yellow Channel]
        YBalance[Virtual Balance System]
        YBridge[Yellow Bridge]
    end

    subgraph "Flare Network Deal Management"
        Deal[DealVault Contract]
        DealPos[DealPosition NFT]
        FTSO[FTSO Price Oracles]
        Protocol[Yield Protocol]
    end

    subgraph "Fluence DePIN Backend Orchestration"
        Fluence[Fluence Compute]
        Indexer[Event Indexer]
        Mapping[User/Deal Mappings]
        Scheduler[Daily Reward Scheduler]
    end

    User -->|1. Deposit LP Token| LP
    LP -->|2a. Try Yellow First| YChannel
    LP -->|2b. Fallback if no liquidity| LZ

    LZ -.->|Cross-chain message| YBridge
    YChannel -->|3. Bridge to Flare| YBridge
    YBridge -->|4. Deliver funds| Deal

    Deal -->|5. Deposit to protocol| Protocol
    Deal -->|Price data| FTSO

    Protocol -->|6. Generate yield| Deal

    Scheduler -->|7. Daily claim| Deal
    Deal -->|8. Credit rewards| YBalance

    User -->|9. Request withdrawal| Fluence
    Fluence -->|10. Process| Deal
    Deal -->|11. Return via Yellow| YBridge
    YBridge -->|12. Deliver to source chain| User

    Indexer -.->|Monitor events| Deal
    Indexer -.->|Update| Mapping

    style Deal fill:#4A90E2
    style YChannel fill:#50E3C2
    style Fluence fill:#F5A623
    style FTSO fill:#7ED321
```

---

## 🔄 User Journey Flowchart

```mermaid
flowchart TD
    Start([User on Any Chain]) --> Browse[Browse Deals on Flare]
    Browse --> Select[Select Deal with APY]
    Select --> Deposit[Deposit LP Token on Source Chain]

    Deposit --> Check{Yellow Has<br/>Liquidity?}
    Check -->|Yes| YellowRoute[Route via Yellow Network]
    Check -->|No| LZRoute[Route via LayerZero]

    YellowRoute --> Arrive[Funds Arrive on Flare]
    LZRoute --> Arrive

    Arrive --> Mint[Receive Position NFT]
    Mint --> Deploy[Deal Deploys to Protocol]
    Deploy --> Earn[Earn Yield Daily]

    Earn --> Claim[Fluence Claims Daily]
    Claim --> Credit[Rewards → Yellow Virtual Balance]

    Credit --> Wait{User Wants<br/>to Withdraw?}
    Wait -->|Not yet| Earn
    Wait -->|Yes| Withdraw[Request Withdrawal]

    Withdraw --> Bridge[Bridge via Yellow]
    Bridge --> Return[Receive on Source Chain]
    Return --> End([Complete])

    style YellowRoute fill:#50E3C2
    style LZRoute fill:#FFB84D
    style Credit fill:#7ED321
    style Earn fill:#4A90E2
```

---

## 🧩 Component Interactions

```mermaid
graph TB
    subgraph "1. Deal Creation Layer"
        DC[Deal Contract on Flare]
        FTSO1[FTSO Price Feed]
    end

    subgraph "2. Cross-Chain Deposit Layer"
        SC[Source Chain LP Tokens]
        YN[Yellow Network Channels]
        LZ[LayerZero Bridge]
    end

    subgraph "3. Yield Generation Layer"
        YP[Yield Protocol on Flare]
        Rewards[Reward Distribution]
    end

    subgraph "4. Orchestration Layer Fluence DePIN"
        Events[Event Indexer]
        Maps[User/Deal/Amount Mappings]
        Cron[Daily Claim Scheduler]
        WithdrawQ[Withdrawal Queue]
    end

    subgraph "5. Virtual Balance Layer"
        YVB[Yellow Virtual Balances]
        Settlement[Cross-Chain Settlement]
    end

    DC --> FTSO1
    SC --> YN
    SC --> LZ
    YN --> DC
    LZ --> YN

    DC --> YP
    YP --> Rewards

    DC -.->|Events| Events
    Events --> Maps
    Maps --> Cron
    Cron --> Rewards
    Rewards --> YVB

    Maps --> WithdrawQ
    WithdrawQ --> Settlement
    Settlement --> YN
    YN --> SC

    style DC fill:#4A90E2
    style YN fill:#50E3C2
    style Events fill:#F5A623
    style YVB fill:#7ED321
```

---

## ⏱️ Daily Reward Claim Process

```mermaid
sequenceDiagram
    participant Cron as Fluence Cron Job
    participant Backend as Fluence Backend
    participant Flare as Flare DealVault
    participant Protocol as Yield Protocol
    participant FTSO as FTSO Oracle
    participant Yellow as Yellow Virtual Balance
    participant Users as All Users

    Note over Cron: Every 24 hours

    Cron->>Backend: Trigger daily claim
    Backend->>Backend: Get all active deals

    loop For each active deal
        Backend->>Flare: claimRewardsFromProtocol(dealId)
        Flare->>Protocol: getAccumulatedRewards()
        Protocol-->>Flare: Return reward tokens

        Flare->>FTSO: getCurrentPrice(rewardToken)
        FTSO-->>Flare: Return price

        Flare->>Backend: Emit RewardsClaimed(dealId, amount, price)

        Backend->>Backend: Get all positions for deal
        Backend->>Backend: Calculate totalDeposited

        loop For each user position
            Backend->>Backend: userReward = (userDeposit / totalDeposit) × totalReward
            Backend->>Yellow: creditVirtualBalance(user, userReward)
            Yellow->>Yellow: Update user balance
        end
    end

    Backend->>Users: Emit BalanceUpdated events
```

---

## 📚 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **L1 Settlement** | Flare Network | Deal management, FTSO oracles |
| **Bridge Primary** | Yellow Network | Fast state channel transfers |
| **Bridge Fallback** | LayerZero | Reliable cross-chain messaging |
| **Backend DePIN** | Fluence | Decentralized orchestration, cron jobs |
| **Price Oracles** | Flare FTSO | Decentralized price feeds |
| **Virtual Balances** | Yellow L2 | Reward crediting without gas |
| **Source Chains** | Any EVM | User deposit origin |
| **Frontend** | React + wagmi | Multi-chain wallet connection |