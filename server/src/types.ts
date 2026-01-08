// YieldPilot Type Definitions

export interface ProtocolData {
  id: string;
  name: string;
  symbol: string;
  category: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  apy?: number;
  apyBase?: number;
  apyReward?: number;
}

export interface YieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number;
  rewardTokens: string[] | null;
  underlyingTokens: string[] | null;
  poolMeta: string | null;
  il7d: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
}

export interface PriceData {
  id: string;
  price: number;
  conf: number;
  expo: number;
  publishTime: number;
  emaPrice?: number;
  emaConf?: number;
}

export interface YieldSignal {
  recommendation: {
    protocol: string;
    name: string;
    expectedAPY: number;
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
    strategyId: number;
  };
  protocols: ProtocolYieldData[];
  analysis: {
    marketCondition: 'bullish' | 'neutral' | 'bearish';
    suggestedAllocation: Record<string, number>;
    rebalanceRecommended: boolean;
    rebalanceUrgency: 'low' | 'medium' | 'high';
  };
  prices: Record<string, number>;
  timestamp: number;
}

export interface ProtocolYieldData {
  id: string;
  name: string;
  category: string;
  tvl: number;
  movementTvl: number;
  apy: number;
  apyBase: number;
  apyReward: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  pools: YieldPool[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskScore: number;
  factors: {
    smartContractRisk: 'low' | 'medium' | 'high';
    liquidityRisk: 'low' | 'medium' | 'high';
    protocolRisk: 'low' | 'medium' | 'high';
    marketRisk: 'low' | 'medium' | 'high';
    concentrationRisk: 'low' | 'medium' | 'high';
  };
  recommendations: string[];
  protocolRisks: Array<{
    protocol: string;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  }>;
  timestamp: number;
}

export interface ProtocolAnalytics {
  protocol: string;
  name: string;
  category: string;
  tvl: number;
  movementTvl: number;
  tvlChange24h: number;
  tvlChange7d: number;
  apy: number;
  apyHistory: Array<{
    date: string;
    apy: number;
  }>;
  tvlHistory: Array<{
    date: number;
    tvl: number;
  }>;
  pools: YieldPool[];
  utilizationRate?: number;
  timestamp: number;
}

// Movement DeFi Protocol identifiers
export const MOVEMENT_PROTOCOLS = {
  ECHELON: 'echelon-market',
  MERIDIAN: 'meridian',
  MOVEPOSITION: 'moveposition',
  LIQUIDSWAP: 'liquidswap',
  CANOPY: 'canopy',
  LAYERBANK: 'layerbank',
  THUNDERHEAD: 'thunderhead',
} as const;

// Strategy IDs (matching Move contract)
export const STRATEGY_IDS = {
  HOLD: 0,
  ECHELON: 1,
  MOVEPOSITION: 2,
  MERIDIAN: 3,
  DIVERSIFIED: 4,
} as const;

// Pyth Price Feed IDs
export const PYTH_PRICE_FEEDS = {
  'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'APT/USD': '03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  'USDC/USD': 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT/USD': '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
} as const;
