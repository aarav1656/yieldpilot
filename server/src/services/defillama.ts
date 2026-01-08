// DefiLlama API Client - Production Integration
// Fetches real TVL, yield, and protocol data from DefiLlama

import axios, { AxiosInstance } from 'axios';
import { ProtocolData, YieldPool, MOVEMENT_PROTOCOLS } from '../types.js';

const DEFILLAMA_BASE_URL = 'https://api.llama.fi';
const DEFILLAMA_YIELDS_URL = 'https://yields.llama.fi';

export class DefiLlamaClient {
  private client: AxiosInstance;
  private yieldsClient: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute cache

  constructor() {
    this.client = axios.create({
      baseURL: DEFILLAMA_BASE_URL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
      },
    });

    this.yieldsClient = axios.create({
      baseURL: DEFILLAMA_YIELDS_URL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get protocol data by slug
   */
  async getProtocol(slug: string): Promise<ProtocolData | null> {
    const cacheKey = `protocol:${slug}`;
    const cached = this.getCached<ProtocolData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get(`/protocol/${slug}`);
      const data = response.data;

      const protocol: ProtocolData = {
        id: data.id || slug,
        name: data.name,
        symbol: data.symbol || '',
        category: data.category || 'Unknown',
        tvl: data.tvl || 0,
        chainTvls: data.chainTvls || {},
        change_1h: data.change_1h,
        change_1d: data.change_1d,
        change_7d: data.change_7d,
      };

      this.setCache(cacheKey, protocol);
      return protocol;
    } catch (error) {
      console.error(`Error fetching protocol ${slug}:`, error);
      return null;
    }
  }

  /**
   * Get all protocols
   */
  async getAllProtocols(): Promise<ProtocolData[]> {
    const cacheKey = 'protocols:all';
    const cached = this.getCached<ProtocolData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/protocols');
      const protocols: ProtocolData[] = response.data.map((p: any) => ({
        id: p.slug || p.id,
        name: p.name,
        symbol: p.symbol || '',
        category: p.category || 'Unknown',
        tvl: p.tvl || 0,
        chainTvls: p.chainTvls || {},
        change_1h: p.change_1h,
        change_1d: p.change_1d,
        change_7d: p.change_7d,
      }));

      this.setCache(cacheKey, protocols);
      return protocols;
    } catch (error) {
      console.error('Error fetching all protocols:', error);
      return [];
    }
  }

  /**
   * Get Movement-specific protocols
   */
  async getMovementProtocols(): Promise<ProtocolData[]> {
    const protocols = await this.getAllProtocols();

    // Filter for Movement chain
    const movementProtocols = protocols.filter(p => {
      const chains = Object.keys(p.chainTvls).map(c => c.toLowerCase());
      return chains.includes('movement') || chains.includes('move');
    });

    // Also fetch specific known Movement protocols
    const knownSlugs = Object.values(MOVEMENT_PROTOCOLS);
    const knownProtocols = await Promise.all(
      knownSlugs.map(slug => this.getProtocol(slug))
    );

    // Merge and dedupe
    const allProtocols = [...movementProtocols];
    for (const p of knownProtocols) {
      if (p && !allProtocols.find(existing => existing.id === p.id)) {
        allProtocols.push(p);
      }
    }

    return allProtocols;
  }

  /**
   * Get yield pools for Movement chain
   */
  async getYieldPools(): Promise<YieldPool[]> {
    const cacheKey = 'yields:movement';
    const cached = this.getCached<YieldPool[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.yieldsClient.get('/pools');
      const pools: YieldPool[] = response.data.data
        .filter((p: any) => {
          const chain = (p.chain || '').toLowerCase();
          return chain === 'movement' || chain === 'move' || chain === 'aptos';
        })
        .map((p: any) => ({
          pool: p.pool,
          chain: p.chain,
          project: p.project,
          symbol: p.symbol,
          tvlUsd: p.tvlUsd || 0,
          apyBase: p.apyBase,
          apyReward: p.apyReward,
          apy: p.apy || (p.apyBase || 0) + (p.apyReward || 0),
          rewardTokens: p.rewardTokens,
          underlyingTokens: p.underlyingTokens,
          poolMeta: p.poolMeta,
          il7d: p.il7d,
          apyBase7d: p.apyBase7d,
          apyMean30d: p.apyMean30d,
          volumeUsd1d: p.volumeUsd1d,
          volumeUsd7d: p.volumeUsd7d,
        }));

      this.setCache(cacheKey, pools);
      return pools;
    } catch (error) {
      console.error('Error fetching yield pools:', error);
      return [];
    }
  }

  /**
   * Get TVL history for a protocol
   */
  async getProtocolTvlHistory(slug: string): Promise<Array<{ date: number; tvl: number }>> {
    const cacheKey = `tvl-history:${slug}`;
    const cached = this.getCached<Array<{ date: number; tvl: number }>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get(`/protocol/${slug}`);
      const tvl = response.data.tvl || [];

      // DefiLlama returns array of [timestamp, tvl] or objects
      const history = Array.isArray(tvl)
        ? tvl.map((item: any) => {
            if (Array.isArray(item)) {
              return { date: item[0], tvl: item[1] };
            }
            return { date: item.date, tvl: item.totalLiquidityUSD || item.tvl || 0 };
          })
        : [];

      this.setCache(cacheKey, history);
      return history;
    } catch (error) {
      console.error(`Error fetching TVL history for ${slug}:`, error);
      return [];
    }
  }

  /**
   * Get chain TVL data for Movement
   */
  async getMovementChainTvl(): Promise<{ tvl: number; protocols: number }> {
    try {
      const response = await this.client.get('/v2/chains');
      const chains = response.data;

      const movement = chains.find(
        (c: any) => c.name?.toLowerCase() === 'movement' || c.gecko_id === 'movement'
      );

      return {
        tvl: movement?.tvl || 0,
        protocols: movement?.protocols || 0,
      };
    } catch (error) {
      console.error('Error fetching Movement chain TVL:', error);
      return { tvl: 0, protocols: 0 };
    }
  }

  /**
   * Get historical yields for a specific pool
   */
  async getPoolYieldHistory(poolId: string): Promise<Array<{ timestamp: string; apy: number }>> {
    const cacheKey = `yield-history:${poolId}`;
    const cached = this.getCached<Array<{ timestamp: string; apy: number }>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.yieldsClient.get(`/chart/${poolId}`);
      const history = (response.data.data || []).map((item: any) => ({
        timestamp: item.timestamp,
        apy: item.apy || 0,
      }));

      this.setCache(cacheKey, history);
      return history;
    } catch (error) {
      console.error(`Error fetching yield history for pool ${poolId}:`, error);
      return [];
    }
  }
}

// Singleton instance
export const defiLlamaClient = new DefiLlamaClient();
