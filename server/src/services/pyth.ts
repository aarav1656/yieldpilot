// Pyth Oracle Client - Production Integration
// Fetches real-time price data from Pyth Network

import { HermesClient } from '@pythnetwork/hermes-client';
import { PriceData, PYTH_PRICE_FEEDS } from '../types.js';

const HERMES_ENDPOINT = process.env.PYTH_HERMES_URL || 'https://hermes.pyth.network';

export class PythClient {
  private client: HermesClient;
  private cache: Map<string, { data: PriceData; timestamp: number }> = new Map();
  private cacheTTL = 5000; // 5 second cache for prices

  constructor() {
    this.client = new HermesClient(HERMES_ENDPOINT);
  }

  private getCached(feedId: string): PriceData | null {
    const cached = this.cache.get(feedId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(feedId: string, data: PriceData): void {
    this.cache.set(feedId, { data, timestamp: Date.now() });
  }

  /**
   * Get latest price for a single feed
   */
  async getPrice(feedId: string): Promise<PriceData | null> {
    const cached = this.getCached(feedId);
    if (cached) return cached;

    try {
      // Add 0x prefix if not present
      const normalizedId = feedId.startsWith('0x') ? feedId : `0x${feedId}`;

      const priceUpdates = await this.client.getLatestPriceUpdates([normalizedId]);

      if (!priceUpdates || !priceUpdates.parsed || priceUpdates.parsed.length === 0) {
        console.error(`No price data for feed ${feedId}`);
        return null;
      }

      const update = priceUpdates.parsed[0];
      const priceInfo = update.price;

      const priceData: PriceData = {
        id: feedId,
        price: Number(priceInfo.price) * Math.pow(10, priceInfo.expo),
        conf: Number(priceInfo.conf) * Math.pow(10, priceInfo.expo),
        expo: priceInfo.expo,
        publishTime: priceInfo.publish_time,
        emaPrice: update.ema_price
          ? Number(update.ema_price.price) * Math.pow(10, update.ema_price.expo)
          : undefined,
        emaConf: update.ema_price
          ? Number(update.ema_price.conf) * Math.pow(10, update.ema_price.expo)
          : undefined,
      };

      this.setCache(feedId, priceData);
      return priceData;
    } catch (error) {
      console.error(`Error fetching price for ${feedId}:`, error);
      return null;
    }
  }

  /**
   * Get latest prices for multiple feeds
   */
  async getPrices(feedIds: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    // Check cache first
    const uncachedIds: string[] = [];
    for (const id of feedIds) {
      const cached = this.getCached(id);
      if (cached) {
        results.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    }

    if (uncachedIds.length === 0) {
      return results;
    }

    try {
      // Normalize IDs
      const normalizedIds = uncachedIds.map((id) =>
        id.startsWith('0x') ? id : `0x${id}`
      );

      const priceUpdates = await this.client.getLatestPriceUpdates(normalizedIds);

      if (priceUpdates && priceUpdates.parsed) {
        for (const update of priceUpdates.parsed) {
          const priceInfo = update.price;
          const feedId = update.id.replace('0x', '');

          const priceData: PriceData = {
            id: feedId,
            price: Number(priceInfo.price) * Math.pow(10, priceInfo.expo),
            conf: Number(priceInfo.conf) * Math.pow(10, priceInfo.expo),
            expo: priceInfo.expo,
            publishTime: priceInfo.publish_time,
            emaPrice: update.ema_price
              ? Number(update.ema_price.price) * Math.pow(10, update.ema_price.expo)
              : undefined,
          };

          this.setCache(feedId, priceData);
          results.set(feedId, priceData);
        }
      }
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
    }

    return results;
  }

  /**
   * Get all common crypto prices
   */
  async getCommonPrices(): Promise<Record<string, number>> {
    const feedIds = Object.values(PYTH_PRICE_FEEDS);
    const prices = await this.getPrices(feedIds);

    const result: Record<string, number> = {};
    for (const [symbol, feedId] of Object.entries(PYTH_PRICE_FEEDS)) {
      const priceData = prices.get(feedId);
      if (priceData) {
        result[symbol] = priceData.price;
      }
    }

    return result;
  }

  /**
   * Get price by symbol
   */
  async getPriceBySymbol(symbol: keyof typeof PYTH_PRICE_FEEDS): Promise<number | null> {
    const feedId = PYTH_PRICE_FEEDS[symbol];
    if (!feedId) {
      console.error(`Unknown price feed symbol: ${symbol}`);
      return null;
    }

    const priceData = await this.getPrice(feedId);
    return priceData?.price ?? null;
  }

  /**
   * Get price update data for on-chain submission
   * Returns the binary data needed to update Pyth prices on-chain
   */
  async getPriceUpdateData(feedIds: string[]): Promise<string[]> {
    try {
      const normalizedIds = feedIds.map((id) =>
        id.startsWith('0x') ? id : `0x${id}`
      );

      const priceUpdates = await this.client.getLatestPriceUpdates(normalizedIds);

      if (priceUpdates && priceUpdates.binary && priceUpdates.binary.data) {
        return priceUpdates.binary.data;
      }

      return [];
    } catch (error) {
      console.error('Error getting price update data:', error);
      return [];
    }
  }
}

// Singleton instance
export const pythClient = new PythClient();
