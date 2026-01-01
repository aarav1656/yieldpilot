import { SIGNAL_SERVER_URL } from "./movement";

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    version: string;
    dataSource: string | string[];
    generatedAt: string;
  };
}

export interface Protocol {
  id: string;
  name: string;
  category: string;
  tvl: number;
}

export interface YieldPool {
  project: string;
  symbol: string;
  apy: number;
  tvlUsd: number;
  chain: string;
}

export interface YieldSignal {
  recommendation: {
    protocol: string;
    name: string;
    expectedAPY: number;
    riskLevel: "low" | "medium" | "high";
    confidence: number;
    strategyId: number;
  };
  protocols: Array<{
    id: string;
    name: string;
    category: string;
    tvl: number;
    movementTvl: number;
    apy: number;
    apyBase: number;
    apyReward: number;
    riskScore: number;
    riskLevel: "low" | "medium" | "high";
  }>;
  analysis: {
    marketCondition: "bullish" | "neutral" | "bearish";
    suggestedAllocation: Record<string, number>;
    rebalanceRecommended: boolean;
    rebalanceUrgency: "low" | "medium" | "high";
  };
  prices: Record<string, number>;
  timestamp: number;
}

export interface RiskAssessment {
  overallRisk: "low" | "medium" | "high";
  riskScore: number;
  factors: {
    smartContractRisk: "low" | "medium" | "high";
    liquidityRisk: "low" | "medium" | "high";
    protocolRisk: "low" | "medium" | "high";
    marketRisk: "low" | "medium" | "high";
    concentrationRisk: "low" | "medium" | "high";
  };
  recommendations: string[];
  protocolRisks: Array<{
    protocol: string;
    riskLevel: "low" | "medium" | "high";
    factors: string[];
  }>;
  timestamp: number;
}

export interface PricingInfo {
  currency: string;
  decimals: number;
  endpoints: Record<string, {
    price: string;
    priceFormatted: string;
    description: string;
  }>;
  payTo: string;
  network: string;
  facilitator: string;
}

// Free API calls
export async function getProtocols(): Promise<ApiResponse<{ protocols: Protocol[]; count: number }>> {
  const response = await fetch(`${SIGNAL_SERVER_URL}/api/protocols`);
  return response.json();
}

export async function getMovementTvl(): Promise<ApiResponse<{
  chain: string;
  totalTvl: number;
  protocolCount: number;
  topProtocols: Array<{ name: string; tvl: number; category: string }>;
}>> {
  const response = await fetch(`${SIGNAL_SERVER_URL}/api/movement/tvl`);
  return response.json();
}

export async function getPriceSummary(): Promise<ApiResponse<{
  "BTC/USD": number;
  "ETH/USD": number;
  timestamp: number;
}>> {
  const response = await fetch(`${SIGNAL_SERVER_URL}/api/prices/summary`);
  return response.json();
}

export async function getYields(): Promise<ApiResponse<{
  topPools: YieldPool[];
  totalPools: number;
}>> {
  const response = await fetch(`${SIGNAL_SERVER_URL}/api/yields`);
  return response.json();
}

export async function getPricing(): Promise<ApiResponse<PricingInfo>> {
  const response = await fetch(`${SIGNAL_SERVER_URL}/api/pricing`);
  return response.json();
}

// Premium API calls (require x402 payment)
export async function getOptimalYieldSignal(paymentHeader?: string): Promise<ApiResponse<YieldSignal>> {
  const headers: HeadersInit = {};
  if (paymentHeader) {
    headers["X-PAYMENT"] = paymentHeader;
  }

  const response = await fetch(`${SIGNAL_SERVER_URL}/api/signal/optimal-yield`, { headers });

  // Check for 402 Payment Required
  if (response.status === 402) {
    const paymentResponse = response.headers.get("X-PAYMENT-RESPONSE");
    return {
      success: false,
      error: "Payment required",
      message: paymentResponse || "Please pay to access this endpoint",
    };
  }

  return response.json();
}

export async function getRiskAssessment(paymentHeader?: string): Promise<ApiResponse<RiskAssessment>> {
  const headers: HeadersInit = {};
  if (paymentHeader) {
    headers["X-PAYMENT"] = paymentHeader;
  }

  const response = await fetch(`${SIGNAL_SERVER_URL}/api/risk/assessment`, { headers });

  if (response.status === 402) {
    const paymentResponse = response.headers.get("X-PAYMENT-RESPONSE");
    return {
      success: false,
      error: "Payment required",
      message: paymentResponse || "Please pay to access this endpoint",
    };
  }

  return response.json();
}

export async function getProtocolAnalytics(
  protocol: string,
  paymentHeader?: string
): Promise<ApiResponse<{
  protocol: string;
  name: string;
  category: string;
  tvl: number;
  movementTvl: number;
  tvlChange24h: number;
  tvlChange7d: number;
  apy: number;
  timestamp: number;
}>> {
  const headers: HeadersInit = {};
  if (paymentHeader) {
    headers["X-PAYMENT"] = paymentHeader;
  }

  const response = await fetch(`${SIGNAL_SERVER_URL}/api/analytics/${protocol}`, { headers });

  if (response.status === 402) {
    return {
      success: false,
      error: "Payment required",
    };
  }

  return response.json();
}

export async function getLivePrices(paymentHeader?: string): Promise<ApiResponse<{
  prices: Record<string, {
    price: number;
    confidence: number;
    publishTime: number;
    emaPrice: number;
  }>;
  summary: Record<string, number>;
}>> {
  const headers: HeadersInit = {};
  if (paymentHeader) {
    headers["X-PAYMENT"] = paymentHeader;
  }

  const response = await fetch(`${SIGNAL_SERVER_URL}/api/prices/live`, { headers });

  if (response.status === 402) {
    return {
      success: false,
      error: "Payment required",
    };
  }

  return response.json();
}
