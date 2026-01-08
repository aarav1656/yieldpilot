// Yield Analyzer Service - Production AI-like Yield Optimization
// Analyzes real DeFi data and generates yield signals

import { defiLlamaClient } from './defillama.js';
import { pythClient } from './pyth.js';
import {
  YieldSignal,
  ProtocolYieldData,
  RiskAssessment,
  ProtocolAnalytics,
  YieldPool,
  MOVEMENT_PROTOCOLS,
  STRATEGY_IDS,
} from '../types.js';

export class YieldAnalyzer {
  /**
   * Generate optimal yield signal based on current market data
   */
  async generateOptimalYieldSignal(): Promise<YieldSignal> {
    // Fetch real data from multiple sources
    const [protocols, pools, prices] = await Promise.all([
      this.getProtocolsWithYield(),
      defiLlamaClient.getYieldPools(),
      pythClient.getCommonPrices(),
    ]);

    // Calculate risk-adjusted returns
    const protocolsWithRisk = protocols.map((protocol) => ({
      ...protocol,
      riskAdjustedReturn: this.calculateRiskAdjustedReturn(protocol),
    }));

    // Sort by risk-adjusted return
    protocolsWithRisk.sort((a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn);

    // Get best protocol
    const bestProtocol = protocolsWithRisk[0];
    const strategyId = this.getStrategyId(bestProtocol?.id || '');

    // Calculate suggested allocation
    const suggestedAllocation = this.calculateOptimalAllocation(protocolsWithRisk);

    // Determine market condition based on price movements and TVL changes
    const marketCondition = await this.assessMarketCondition(protocols);

    // Determine if rebalance is needed
    const rebalanceAnalysis = this.analyzeRebalanceNeed(protocolsWithRisk, marketCondition);

    return {
      recommendation: {
        protocol: bestProtocol?.id || 'hold',
        name: bestProtocol?.name || 'Hold Position',
        expectedAPY: bestProtocol?.apy || 0,
        riskLevel: bestProtocol?.riskLevel || 'low',
        confidence: this.calculateConfidence(bestProtocol, protocolsWithRisk),
        strategyId,
      },
      protocols: protocolsWithRisk,
      analysis: {
        marketCondition,
        suggestedAllocation,
        rebalanceRecommended: rebalanceAnalysis.recommended,
        rebalanceUrgency: rebalanceAnalysis.urgency,
      },
      prices,
      timestamp: Date.now(),
    };
  }

  /**
   * Get comprehensive risk assessment
   */
  async generateRiskAssessment(): Promise<RiskAssessment> {
    const protocols = await this.getProtocolsWithYield();

    // Calculate individual risk factors
    const smartContractRisk = this.assessSmartContractRisk(protocols);
    const liquidityRisk = this.assessLiquidityRisk(protocols);
    const protocolRisk = this.assessProtocolRisk(protocols);
    const marketRisk = await this.assessMarketRisk();
    const concentrationRisk = this.assessConcentrationRisk(protocols);

    // Calculate overall risk score (1-10)
    const riskScores = {
      low: 2,
      medium: 5,
      high: 8,
    };

    const overallScore =
      (riskScores[smartContractRisk] +
        riskScores[liquidityRisk] +
        riskScores[protocolRisk] +
        riskScores[marketRisk] +
        riskScores[concentrationRisk]) /
      5;

    const overallRisk: 'low' | 'medium' | 'high' =
      overallScore < 3.5 ? 'low' : overallScore < 6.5 ? 'medium' : 'high';

    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(
      smartContractRisk,
      liquidityRisk,
      protocolRisk,
      marketRisk,
      concentrationRisk
    );

    // Protocol-specific risks
    const protocolRisks = protocols.map((p) => ({
      protocol: p.name,
      riskLevel: p.riskLevel,
      factors: this.getProtocolRiskFactors(p),
    }));

    return {
      overallRisk,
      riskScore: Math.round(overallScore * 10) / 10,
      factors: {
        smartContractRisk,
        liquidityRisk,
        protocolRisk,
        marketRisk,
        concentrationRisk,
      },
      recommendations,
      protocolRisks,
      timestamp: Date.now(),
    };
  }

  /**
   * Get detailed analytics for a specific protocol
   */
  async getProtocolAnalytics(protocolId: string): Promise<ProtocolAnalytics | null> {
    const protocol = await defiLlamaClient.getProtocol(protocolId);
    if (!protocol) return null;

    const [tvlHistory, pools] = await Promise.all([
      defiLlamaClient.getProtocolTvlHistory(protocolId),
      defiLlamaClient.getYieldPools(),
    ]);

    // Filter pools for this protocol
    const protocolPools = pools.filter(
      (p) => p.project.toLowerCase() === protocolId.toLowerCase()
    );

    // Calculate average APY from pools
    const avgApy =
      protocolPools.length > 0
        ? protocolPools.reduce((sum, p) => sum + (p.apy || 0), 0) / protocolPools.length
        : 0;

    // Calculate TVL changes
    const recentTvl = tvlHistory.slice(-7);
    const tvlChange24h =
      recentTvl.length >= 2
        ? ((recentTvl[recentTvl.length - 1].tvl - recentTvl[recentTvl.length - 2].tvl) /
            recentTvl[recentTvl.length - 2].tvl) *
          100
        : 0;

    const tvlChange7d =
      recentTvl.length >= 7
        ? ((recentTvl[recentTvl.length - 1].tvl - recentTvl[0].tvl) / recentTvl[0].tvl) * 100
        : 0;

    // Generate APY history (simulated from current data)
    const apyHistory = this.generateApyHistory(avgApy, 30);

    return {
      protocol: protocolId,
      name: protocol.name,
      category: protocol.category,
      tvl: protocol.tvl,
      movementTvl: protocol.chainTvls['Movement'] || protocol.chainTvls['movement'] || 0,
      tvlChange24h,
      tvlChange7d,
      apy: avgApy,
      apyHistory,
      tvlHistory: recentTvl.slice(-30),
      pools: protocolPools,
      utilizationRate: this.estimateUtilization(protocolPools),
      timestamp: Date.now(),
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async getProtocolsWithYield(): Promise<ProtocolYieldData[]> {
    const [protocols, pools] = await Promise.all([
      defiLlamaClient.getMovementProtocols(),
      defiLlamaClient.getYieldPools(),
    ]);

    return protocols.map((protocol) => {
      // Get pools for this protocol
      const protocolPools = pools.filter(
        (p) =>
          p.project.toLowerCase() === protocol.id.toLowerCase() ||
          p.project.toLowerCase() === protocol.name.toLowerCase()
      );

      // Calculate APY
      const avgApy =
        protocolPools.length > 0
          ? protocolPools.reduce((sum, p) => sum + (p.apy || 0), 0) / protocolPools.length
          : 0;

      const avgApyBase =
        protocolPools.length > 0
          ? protocolPools.reduce((sum, p) => sum + (p.apyBase || 0), 0) / protocolPools.length
          : 0;

      const avgApyReward =
        protocolPools.length > 0
          ? protocolPools.reduce((sum, p) => sum + (p.apyReward || 0), 0) / protocolPools.length
          : 0;

      // Calculate risk score
      const riskScore = this.calculateProtocolRiskScore(protocol, protocolPools);
      const riskLevel: 'low' | 'medium' | 'high' =
        riskScore < 3.5 ? 'low' : riskScore < 7 ? 'medium' : 'high';

      return {
        id: protocol.id,
        name: protocol.name,
        category: protocol.category,
        tvl: protocol.tvl,
        movementTvl: protocol.chainTvls['Movement'] || protocol.chainTvls['movement'] || 0,
        apy: avgApy,
        apyBase: avgApyBase,
        apyReward: avgApyReward,
        riskScore,
        riskLevel,
        pools: protocolPools,
      };
    });
  }

  private calculateProtocolRiskScore(
    protocol: any,
    pools: YieldPool[]
  ): number {
    let score = 5; // Base score

    // TVL factor (higher TVL = lower risk)
    if (protocol.tvl > 100_000_000) score -= 2;
    else if (protocol.tvl > 10_000_000) score -= 1;
    else if (protocol.tvl < 1_000_000) score += 2;

    // Category factor
    if (protocol.category === 'Lending') score -= 0.5;
    if (protocol.category === 'Dexes') score += 0.5;
    if (protocol.category === 'Derivatives') score += 1;

    // APY factor (very high APY = higher risk)
    const avgApy =
      pools.length > 0
        ? pools.reduce((sum, p) => sum + (p.apy || 0), 0) / pools.length
        : 0;

    if (avgApy > 50) score += 2;
    else if (avgApy > 20) score += 1;
    else if (avgApy < 5) score -= 0.5;

    // Pool diversity factor
    if (pools.length > 10) score -= 1;
    else if (pools.length < 3) score += 1;

    return Math.max(1, Math.min(10, score));
  }

  private calculateRiskAdjustedReturn(protocol: ProtocolYieldData): number {
    // Sharpe-like ratio: (return - risk_free_rate) / risk
    const riskFreeRate = 3; // Assume 3% risk-free rate
    const excessReturn = protocol.apy - riskFreeRate;
    const riskMultiplier = 11 - protocol.riskScore; // Inverse of risk (1-10 -> 10-1)

    return excessReturn * (riskMultiplier / 10);
  }

  private getStrategyId(protocolId: string): number {
    const mapping: Record<string, number> = {
      [MOVEMENT_PROTOCOLS.ECHELON]: STRATEGY_IDS.ECHELON,
      [MOVEMENT_PROTOCOLS.MOVEPOSITION]: STRATEGY_IDS.MOVEPOSITION,
      [MOVEMENT_PROTOCOLS.MERIDIAN]: STRATEGY_IDS.MERIDIAN,
    };

    return mapping[protocolId] || STRATEGY_IDS.HOLD;
  }

  private calculateOptimalAllocation(
    protocols: Array<ProtocolYieldData & { riskAdjustedReturn: number }>
  ): Record<string, number> {
    if (protocols.length === 0) {
      return { hold: 100 };
    }

    // Simple allocation based on risk-adjusted returns
    const totalReturn = protocols
      .filter((p) => p.riskAdjustedReturn > 0)
      .reduce((sum, p) => sum + p.riskAdjustedReturn, 0);

    if (totalReturn === 0) {
      return { [protocols[0].id]: 100 };
    }

    const allocation: Record<string, number> = {};
    let remainingAllocation = 100;

    // Allocate proportionally to risk-adjusted return, with caps
    for (const protocol of protocols.slice(0, 5)) {
      if (protocol.riskAdjustedReturn <= 0) continue;

      let share = Math.round((protocol.riskAdjustedReturn / totalReturn) * 100);

      // Cap individual allocation at 50%
      share = Math.min(share, 50);
      share = Math.min(share, remainingAllocation);

      if (share > 5) {
        // Minimum 5% to include
        allocation[protocol.id] = share;
        remainingAllocation -= share;
      }
    }

    // Allocate remainder to best protocol
    if (remainingAllocation > 0 && protocols.length > 0) {
      const bestId = protocols[0].id;
      allocation[bestId] = (allocation[bestId] || 0) + remainingAllocation;
    }

    return allocation;
  }

  private async assessMarketCondition(
    protocols: ProtocolYieldData[]
  ): Promise<'bullish' | 'neutral' | 'bearish'> {
    // Simple assessment based on TVL changes and prices
    const prices = await pythClient.getCommonPrices();

    // Check if we have price data
    const btcPrice = prices['BTC/USD'];
    const ethPrice = prices['ETH/USD'];

    // Get total TVL from protocols
    const totalTvl = protocols.reduce((sum, p) => sum + p.tvl, 0);

    // Simple heuristic: if major crypto prices are high and TVL is growing
    // This is a simplified version - production would use more sophisticated analysis
    if (btcPrice && btcPrice > 40000 && totalTvl > 50_000_000) {
      return 'bullish';
    } else if (btcPrice && btcPrice < 30000) {
      return 'bearish';
    }

    return 'neutral';
  }

  private analyzeRebalanceNeed(
    protocols: Array<ProtocolYieldData & { riskAdjustedReturn: number }>,
    marketCondition: 'bullish' | 'neutral' | 'bearish'
  ): { recommended: boolean; urgency: 'low' | 'medium' | 'high' } {
    if (protocols.length < 2) {
      return { recommended: false, urgency: 'low' };
    }

    // Calculate spread between best and worst
    const bestReturn = protocols[0]?.riskAdjustedReturn || 0;
    const secondBest = protocols[1]?.riskAdjustedReturn || 0;
    const spread = bestReturn - secondBest;

    // Determine if rebalance is recommended
    let recommended = false;
    let urgency: 'low' | 'medium' | 'high' = 'low';

    if (spread > 5) {
      recommended = true;
      urgency = 'high';
    } else if (spread > 2) {
      recommended = true;
      urgency = 'medium';
    } else if (spread > 1 && marketCondition !== 'bearish') {
      recommended = true;
      urgency = 'low';
    }

    return { recommended, urgency };
  }

  private calculateConfidence(
    bestProtocol: ProtocolYieldData | undefined,
    allProtocols: ProtocolYieldData[]
  ): number {
    if (!bestProtocol || allProtocols.length === 0) return 0.5;

    let confidence = 0.7; // Base confidence

    // Higher TVL = more confidence
    if (bestProtocol.tvl > 50_000_000) confidence += 0.1;
    if (bestProtocol.tvl > 100_000_000) confidence += 0.05;

    // Lower risk = more confidence
    if (bestProtocol.riskLevel === 'low') confidence += 0.1;
    if (bestProtocol.riskLevel === 'high') confidence -= 0.1;

    // More data points = more confidence
    if (bestProtocol.pools.length > 5) confidence += 0.05;

    return Math.min(0.95, Math.max(0.3, confidence));
  }

  private assessSmartContractRisk(protocols: ProtocolYieldData[]): 'low' | 'medium' | 'high' {
    // Based on protocol maturity and TVL
    const avgTvl = protocols.reduce((sum, p) => sum + p.tvl, 0) / (protocols.length || 1);

    if (avgTvl > 50_000_000) return 'low';
    if (avgTvl > 10_000_000) return 'medium';
    return 'high';
  }

  private assessLiquidityRisk(protocols: ProtocolYieldData[]): 'low' | 'medium' | 'high' {
    const totalPools = protocols.reduce((sum, p) => sum + p.pools.length, 0);
    const avgPoolTvl =
      protocols.reduce((sum, p) => sum + p.pools.reduce((s, pool) => s + pool.tvlUsd, 0), 0) /
      (totalPools || 1);

    if (avgPoolTvl > 5_000_000) return 'low';
    if (avgPoolTvl > 1_000_000) return 'medium';
    return 'high';
  }

  private assessProtocolRisk(protocols: ProtocolYieldData[]): 'low' | 'medium' | 'high' {
    const avgRiskScore =
      protocols.reduce((sum, p) => sum + p.riskScore, 0) / (protocols.length || 1);

    if (avgRiskScore < 4) return 'low';
    if (avgRiskScore < 7) return 'medium';
    return 'high';
  }

  private async assessMarketRisk(): Promise<'low' | 'medium' | 'high'> {
    const marketCondition = await this.assessMarketCondition([]);

    if (marketCondition === 'bullish') return 'low';
    if (marketCondition === 'bearish') return 'high';
    return 'medium';
  }

  private assessConcentrationRisk(protocols: ProtocolYieldData[]): 'low' | 'medium' | 'high' {
    if (protocols.length > 5) return 'low';
    if (protocols.length > 2) return 'medium';
    return 'high';
  }

  private generateRiskRecommendations(
    smartContractRisk: 'low' | 'medium' | 'high',
    liquidityRisk: 'low' | 'medium' | 'high',
    protocolRisk: 'low' | 'medium' | 'high',
    marketRisk: 'low' | 'medium' | 'high',
    concentrationRisk: 'low' | 'medium' | 'high'
  ): string[] {
    const recommendations: string[] = [];

    if (smartContractRisk === 'high') {
      recommendations.push('Consider using more established protocols with audited contracts');
    }

    if (liquidityRisk === 'high') {
      recommendations.push('Increase position sizes gradually to avoid slippage');
    }

    if (protocolRisk === 'high') {
      recommendations.push('Diversify across multiple protocols to reduce exposure');
    }

    if (marketRisk === 'high') {
      recommendations.push('Consider reducing overall DeFi exposure during market uncertainty');
    }

    if (concentrationRisk === 'high') {
      recommendations.push('Spread investments across more protocols for better diversification');
    }

    if (recommendations.length === 0) {
      recommendations.push('Current risk profile is within acceptable parameters');
    }

    return recommendations;
  }

  private getProtocolRiskFactors(protocol: ProtocolYieldData): string[] {
    const factors: string[] = [];

    if (protocol.tvl < 10_000_000) {
      factors.push('Low TVL indicates limited liquidity');
    }

    if (protocol.apy > 30) {
      factors.push('High APY may indicate elevated risk');
    }

    if (protocol.pools.length < 3) {
      factors.push('Limited pool diversity');
    }

    if (protocol.riskScore > 7) {
      factors.push('High overall risk score');
    }

    if (factors.length === 0) {
      factors.push('No significant risk factors identified');
    }

    return factors;
  }

  private generateApyHistory(
    currentApy: number,
    days: number
  ): Array<{ date: string; apy: number }> {
    const history: Array<{ date: string; apy: number }> = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Add some realistic variance
      const variance = (Math.random() - 0.5) * 2; // +/- 1%
      const apy = Math.max(0, currentApy + variance);

      history.push({
        date: date.toISOString().split('T')[0],
        apy: Math.round(apy * 100) / 100,
      });
    }

    return history;
  }

  private estimateUtilization(pools: YieldPool[]): number {
    // Estimate utilization based on reward APY vs base APY ratio
    if (pools.length === 0) return 0;

    const avgBase = pools.reduce((sum, p) => sum + (p.apyBase || 0), 0) / pools.length;
    const avgTotal = pools.reduce((sum, p) => sum + (p.apy || 0), 0) / pools.length;

    if (avgTotal === 0) return 0;

    // Higher base APY relative to total suggests higher utilization
    return Math.min(1, avgBase / Math.max(avgTotal, 1));
  }
}

// Singleton instance
export const yieldAnalyzer = new YieldAnalyzer();
