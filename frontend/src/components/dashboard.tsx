"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { ConnectWallet } from "./connect-wallet";
import { useX402Payment } from "@/hooks/use-x402-payment";
import {
  getMovementTvl,
  getYields,
  getPriceSummary,
  YieldSignal,
  RiskAssessment,
} from "@/lib/api";
import { formatUSD } from "@/lib/lib/utils";
import {
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Lock,
  Loader2,
  BarChart3,
  Activity,
} from "lucide-react";

interface MarketData {
  totalTvl: number;
  protocolCount: number;
  btcPrice: number;
  ethPrice: number;
  topPools: Array<{ project: string; symbol: string; apy: number; tvlUsd: number }>;
}

export function Dashboard() {
  const { account } = useWallet();
  const { getYieldSignal, getRiskAssessment, isConnected } = useX402Payment();

  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [yieldSignal, setYieldSignal] = useState<YieldSignal | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [isLoadingSignal, setIsLoadingSignal] = useState(false);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch free market data
  useEffect(() => {
    async function fetchMarketData() {
      setIsLoadingMarket(true);
      try {
        const [tvlRes, yieldsRes, pricesRes] = await Promise.all([
          getMovementTvl(),
          getYields(),
          getPriceSummary(),
        ]);

        setMarketData({
          totalTvl: tvlRes.data?.totalTvl || 0,
          protocolCount: tvlRes.data?.protocolCount || 0,
          btcPrice: pricesRes.data?.["BTC/USD"] || 0,
          ethPrice: pricesRes.data?.["ETH/USD"] || 0,
          topPools: yieldsRes.data?.topPools || [],
        });
      } catch (err) {
        setError("Failed to fetch market data");
      }
      setIsLoadingMarket(false);
    }

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Request yield signal (premium endpoint with x402)
  const handleRequestYieldSignal = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    setIsLoadingSignal(true);
    setError(null);

    try {
      const result = await getYieldSignal();

      if (result.success && result.data) {
        setYieldSignal(result.data);
      } else {
        // Provide user-friendly error messages
        let errorMsg = result.error || "Failed to fetch yield signal";
        if (errorMsg.includes("account_not_found")) {
          errorMsg = "Your wallet needs MOVE tokens on Movement Mainnet to pay for this signal. Please fund your wallet first.";
        } else if (errorMsg.includes("insufficient")) {
          errorMsg = "Insufficient MOVE balance. Please add funds to your wallet.";
        }
        setError(errorMsg);
      }
    } catch (err: any) {
      let errorMsg = err.message || "Failed to fetch yield signal";
      if (errorMsg.includes("account_not_found")) {
        errorMsg = "Your wallet needs MOVE tokens on Movement Mainnet to pay for this signal. Please fund your wallet first.";
      }
      setError(errorMsg);
    }

    setIsLoadingSignal(false);
  };

  // Request risk assessment (premium endpoint with x402)
  const handleRequestRiskAssessment = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    setIsLoadingRisk(true);
    setError(null);

    try {
      const result = await getRiskAssessment();

      if (result.success && result.data) {
        setRiskAssessment(result.data);
      } else {
        // Provide user-friendly error messages
        let errorMsg = result.error || "Failed to fetch risk assessment";
        if (errorMsg.includes("account_not_found")) {
          errorMsg = "Your wallet needs MOVE tokens on Movement Mainnet to pay for this assessment. Please fund your wallet first.";
        } else if (errorMsg.includes("insufficient")) {
          errorMsg = "Insufficient MOVE balance. Please add funds to your wallet.";
        }
        setError(errorMsg);
      }
    } catch (err: any) {
      let errorMsg = err.message || "Failed to fetch risk assessment";
      if (errorMsg.includes("account_not_found")) {
        errorMsg = "Your wallet needs MOVE tokens on Movement Mainnet to pay for this assessment. Please fund your wallet first.";
      }
      setError(errorMsg);
    }

    setIsLoadingRisk(false);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-400 bg-green-400/10";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10";
      case "high":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-zinc-400 bg-zinc-400/10";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-movement-yellow rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-bold">YieldPilot</span>
            <span className="text-xs bg-movement-yellow/20 text-movement-yellow px-2 py-1 rounded-full">
              Dashboard
            </span>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Market Overview */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Market Overview</h2>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Activity className="w-4 h-4 text-green-400 pulse-dot" />
              Live Data
            </div>
          </div>

          {isLoadingMarket ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-20 mb-2" />
                  <div className="h-8 bg-zinc-800 rounded w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <p className="text-sm text-zinc-400 mb-1">Movement TVL</p>
                <p className="text-2xl font-bold">{formatUSD(marketData?.totalTvl || 0)}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <p className="text-sm text-zinc-400 mb-1">Protocols</p>
                <p className="text-2xl font-bold">{marketData?.protocolCount || 0}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <p className="text-sm text-zinc-400 mb-1">BTC/USD</p>
                <p className="text-2xl font-bold">{formatUSD(marketData?.btcPrice || 0)}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <p className="text-sm text-zinc-400 mb-1">ETH/USD</p>
                <p className="text-2xl font-bold">{formatUSD(marketData?.ethPrice || 0)}</p>
              </div>
            </div>
          )}
        </section>

        {/* Top Yield Pools (Free) */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Top Yield Pools</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-sm text-zinc-400 font-medium px-6 py-4">Pool</th>
                  <th className="text-left text-sm text-zinc-400 font-medium px-6 py-4">Project</th>
                  <th className="text-right text-sm text-zinc-400 font-medium px-6 py-4">APY</th>
                  <th className="text-right text-sm text-zinc-400 font-medium px-6 py-4">TVL</th>
                </tr>
              </thead>
              <tbody>
                {marketData?.topPools.slice(0, 5).map((pool, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{pool.symbol}</td>
                    <td className="px-6 py-4 text-zinc-400">{pool.project}</td>
                    <td className="px-6 py-4 text-right text-green-400 font-medium">
                      {pool.apy.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-400">
                      {formatUSD(pool.tvlUsd)}
                    </td>
                  </tr>
                ))}
                {(!marketData || marketData.topPools.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                      No yield pools found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Premium Signals */}
        <section className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Yield Signal Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-movement-yellow/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-movement-yellow" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Yield Signal</h3>
                  <p className="text-sm text-zinc-400">0.01 MOVE per request</p>
                </div>
              </div>
              <button
                onClick={handleRequestYieldSignal}
                disabled={isLoadingSignal}
                className="flex items-center gap-2 bg-movement-yellow text-black px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {isLoadingSignal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : yieldSignal ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {yieldSignal ? "Refresh" : "Get Signal"}
              </button>
            </div>

            {yieldSignal ? (
              <div className="space-y-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-1">Recommended Protocol</p>
                  <p className="text-xl font-bold">{yieldSignal.recommendation.name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-green-400 font-medium">
                      {yieldSignal.recommendation.expectedAPY.toFixed(2)}% APY
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getRiskColor(yieldSignal.recommendation.riskLevel)}`}>
                      {yieldSignal.recommendation.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-400">Market Condition</p>
                    <p className="font-medium capitalize">{yieldSignal.analysis.marketCondition}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-400">Confidence</p>
                    <p className="font-medium">{(yieldSignal.recommendation.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>

                {yieldSignal.analysis.rebalanceRecommended && (
                  <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400">
                      Rebalance recommended ({yieldSignal.analysis.rebalanceUrgency} urgency)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Lock className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">
                  Get AI-powered yield recommendations
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Pay 0.01 MOVE to unlock this signal
                </p>
              </div>
            )}
          </div>

          {/* Risk Assessment Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-400/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Risk Assessment</h3>
                  <p className="text-sm text-zinc-400">0.005 MOVE per request</p>
                </div>
              </div>
              <button
                onClick={handleRequestRiskAssessment}
                disabled={isLoadingRisk}
                className="flex items-center gap-2 bg-green-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {isLoadingRisk ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : riskAssessment ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {riskAssessment ? "Refresh" : "Assess Risk"}
              </button>
            </div>

            {riskAssessment ? (
              <div className="space-y-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-1">Overall Risk Level</p>
                  <div className="flex items-center gap-3">
                    <p className={`text-2xl font-bold capitalize ${riskAssessment.overallRisk === 'low' ? 'text-green-400' :
                        riskAssessment.overallRisk === 'medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                      {riskAssessment.overallRisk}
                    </p>
                    <span className="text-zinc-400">
                      Score: {riskAssessment.riskScore}/100
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(riskAssessment.factors).map(([key, value]) => (
                    <div key={key} className="bg-zinc-800 rounded-lg p-2">
                      <p className="text-xs text-zinc-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className={`text-sm font-medium capitalize ${value === 'low' ? 'text-green-400' :
                          value === 'medium' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {riskAssessment.recommendations.length > 0 && (
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-400 mb-2">Recommendations</p>
                    <ul className="space-y-1">
                      {riskAssessment.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">
                  Get comprehensive risk analysis
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Pay 0.005 MOVE to unlock this assessment
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-red-400/10 border border-red-400/30 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Info Box */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">How x402 Payments Work</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                YieldPilot uses the x402 protocol for instant micropayments. When you request a premium signal,
                you sign a payment transaction that gets verified by the server. No subscriptions,
                no locked funds — just pay for what you use. All payments are processed on Movement Network
                with sub-second finality.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
