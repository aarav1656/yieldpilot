// YieldPilot x402 Signal Server
// Production-grade API server with real DeFi data and x402 payments

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { x402Paywall } from 'x402plus';
import 'dotenv/config';

import { yieldAnalyzer } from './services/yield-analyzer.js';
import { defiLlamaClient } from './services/defillama.js';
import { pythClient } from './services/pyth.js';
import { MOVEMENT_PROTOCOLS, PYTH_PRICE_FEEDS } from './types.js';

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 4402;
const MOVEMENT_PAY_TO = process.env.MOVEMENT_PAY_TO;
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.stableyard.fi';

// Pricing in MOVE base units (8 decimals)
const PRICES = {
  OPTIMAL_YIELD: process.env.SIGNAL_PRICE_OPTIMAL_YIELD || '1000000',    // 0.01 MOVE
  PROTOCOL_ANALYTICS: process.env.SIGNAL_PRICE_PROTOCOL_ANALYTICS || '100000',  // 0.001 MOVE
  RISK_ASSESSMENT: process.env.SIGNAL_PRICE_RISK_ASSESSMENT || '500000',   // 0.005 MOVE
  PRICE_FEED: process.env.SIGNAL_PRICE_PRICE_FEED || '50000',         // 0.0005 MOVE
};

// Validate required config
if (!MOVEMENT_PAY_TO) {
  console.error('ERROR: MOVEMENT_PAY_TO environment variable is required');
  console.error('Please set your Movement wallet address in .env');
  process.exit(1);
}

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002'],
  exposedHeaders: ['X-PAYMENT-RESPONSE'],
  credentials: true,
}));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// x402 PAYWALL CONFIGURATION
// ============================================

app.use(
  x402Paywall(
    MOVEMENT_PAY_TO,
    {
      // Premium Endpoint: Optimal Yield Signal
      'GET /api/signal/optimal-yield': {
        network: 'movement',
        asset: '0x1::aptos_coin::AptosCoin',
        maxAmountRequired: PRICES.OPTIMAL_YIELD,
        description: 'AI-powered optimal yield strategy recommendation',
        mimeType: 'application/json',
        maxTimeoutSeconds: 600,
      },

      // Premium Endpoint: Protocol Analytics
      'GET /api/analytics/:protocol': {
        network: 'movement',
        asset: '0x1::aptos_coin::AptosCoin',
        maxAmountRequired: PRICES.PROTOCOL_ANALYTICS,
        description: 'Detailed protocol performance analytics',
        mimeType: 'application/json',
        maxTimeoutSeconds: 600,
      },

      // Premium Endpoint: Risk Assessment
      'GET /api/risk/assessment': {
        network: 'movement',
        asset: '0x1::aptos_coin::AptosCoin',
        maxAmountRequired: PRICES.RISK_ASSESSMENT,
        description: 'Comprehensive portfolio risk assessment',
        mimeType: 'application/json',
        maxTimeoutSeconds: 600,
      },

      // Premium Endpoint: Real-time Price Feed
      'GET /api/prices/live': {
        network: 'movement',
        asset: '0x1::aptos_coin::AptosCoin',
        maxAmountRequired: PRICES.PRICE_FEED,
        description: 'Real-time Pyth oracle price feeds',
        mimeType: 'application/json',
        maxTimeoutSeconds: 600,
      },
    },
    {
      url: X402_FACILITATOR_URL,
    }
  )
);

// ============================================
// PREMIUM ENDPOINTS (x402 Protected)
// ============================================

/**
 * GET /api/signal/optimal-yield
 * Returns AI-generated optimal yield strategy
 * Price: 0.01 MOVE
 */
app.get('/api/signal/optimal-yield', async (_req: Request, res: Response) => {
  try {
    const signal = await yieldAnalyzer.generateOptimalYieldSignal();

    res.json({
      success: true,
      data: signal,
      meta: {
        version: '1.0.0',
        dataSource: ['DefiLlama', 'Pyth Network'],
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating yield signal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate yield signal',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/analytics/:protocol
 * Returns detailed analytics for a specific protocol
 * Price: 0.001 MOVE
 */
app.get('/api/analytics/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;

    // Validate protocol ID
    const validProtocols = Object.values(MOVEMENT_PROTOCOLS);
    if (!validProtocols.includes(protocol as any)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid protocol',
        validProtocols,
      });
    }

    const analytics = await yieldAnalyzer.getProtocolAnalytics(protocol);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: 'Protocol not found or no data available',
      });
    }

    res.json({
      success: true,
      data: analytics,
      meta: {
        version: '1.0.0',
        dataSource: 'DefiLlama',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching protocol analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch protocol analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/risk/assessment
 * Returns comprehensive risk assessment
 * Price: 0.005 MOVE
 */
app.get('/api/risk/assessment', async (_req: Request, res: Response) => {
  try {
    const assessment = await yieldAnalyzer.generateRiskAssessment();

    res.json({
      success: true,
      data: assessment,
      meta: {
        version: '1.0.0',
        dataSource: ['DefiLlama', 'Pyth Network'],
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating risk assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate risk assessment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/prices/live
 * Returns real-time prices from Pyth oracle
 * Price: 0.0005 MOVE
 */
app.get('/api/prices/live', async (_req: Request, res: Response) => {
  try {
    const prices = await pythClient.getCommonPrices();

    // Get detailed price data for each feed
    const detailedPrices: Record<string, any> = {};
    for (const [symbol, feedId] of Object.entries(PYTH_PRICE_FEEDS)) {
      const priceData = await pythClient.getPrice(feedId);
      if (priceData) {
        detailedPrices[symbol] = {
          price: priceData.price,
          confidence: priceData.conf,
          publishTime: priceData.publishTime,
          emaPrice: priceData.emaPrice,
        };
      }
    }

    res.json({
      success: true,
      data: {
        prices: detailedPrices,
        summary: prices,
      },
      meta: {
        version: '1.0.0',
        dataSource: 'Pyth Network (Hermes)',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching live prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live prices',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================
// FREE PUBLIC ENDPOINTS
// ============================================

/**
 * GET /api/protocols
 * Returns list of supported protocols (free)
 */
app.get('/api/protocols', async (_req: Request, res: Response) => {
  try {
    const protocols = await defiLlamaClient.getMovementProtocols();

    res.json({
      success: true,
      data: {
        protocols: protocols.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          tvl: p.tvl,
        })),
        count: protocols.length,
      },
      message: 'For detailed analytics, use the premium /api/analytics/:protocol endpoint',
    });
  } catch (error) {
    console.error('Error fetching protocols:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch protocols',
    });
  }
});

/**
 * GET /api/movement/tvl
 * Returns Movement chain TVL summary (free)
 */
app.get('/api/movement/tvl', async (_req: Request, res: Response) => {
  try {
    const tvlData = await defiLlamaClient.getMovementChainTvl();
    const protocols = await defiLlamaClient.getMovementProtocols();

    res.json({
      success: true,
      data: {
        chain: 'Movement',
        totalTvl: tvlData.tvl,
        protocolCount: tvlData.protocols || protocols.length,
        topProtocols: protocols
          .sort((a, b) => b.tvl - a.tvl)
          .slice(0, 5)
          .map((p) => ({
            name: p.name,
            tvl: p.tvl,
            category: p.category,
          })),
      },
    });
  } catch (error) {
    console.error('Error fetching Movement TVL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Movement TVL',
    });
  }
});

/**
 * GET /api/prices/summary
 * Returns basic price summary (free)
 */
app.get('/api/prices/summary', async (_req: Request, res: Response) => {
  try {
    const btcPrice = await pythClient.getPriceBySymbol('BTC/USD');
    const ethPrice = await pythClient.getPriceBySymbol('ETH/USD');

    res.json({
      success: true,
      data: {
        'BTC/USD': btcPrice,
        'ETH/USD': ethPrice,
        timestamp: Date.now(),
      },
      message: 'For detailed price feeds with confidence intervals, use the premium /api/prices/live endpoint',
    });
  } catch (error) {
    console.error('Error fetching price summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices',
    });
  }
});

/**
 * GET /api/yields
 * Returns basic yield pool data (free)
 */
app.get('/api/yields', async (_req: Request, res: Response) => {
  try {
    const pools = await defiLlamaClient.getYieldPools();

    // Return limited free data
    const topPools = pools
      .filter((p) => p.apy > 0)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, 10)
      .map((p) => ({
        project: p.project,
        symbol: p.symbol,
        apy: Math.round(p.apy * 100) / 100,
        tvlUsd: p.tvlUsd,
        chain: p.chain,
      }));

    res.json({
      success: true,
      data: {
        topPools,
        totalPools: pools.length,
      },
      message: 'For AI-optimized yield recommendations, use the premium /api/signal/optimal-yield endpoint',
    });
  } catch (error) {
    console.error('Error fetching yields:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch yields',
    });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'YieldPilot x402 Server',
    version: '1.0.0',
    timestamp: Date.now(),
    endpoints: {
      free: ['/api/protocols', '/api/movement/tvl', '/api/prices/summary', '/api/yields'],
      premium: ['/api/signal/optimal-yield', '/api/analytics/:protocol', '/api/risk/assessment', '/api/prices/live'],
    },
  });
});

/**
 * GET /api/pricing
 * Returns x402 pricing information
 */
app.get('/api/pricing', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      currency: 'MOVE',
      decimals: 8,
      endpoints: {
        '/api/signal/optimal-yield': {
          price: PRICES.OPTIMAL_YIELD,
          priceFormatted: `${parseInt(PRICES.OPTIMAL_YIELD) / 100_000_000} MOVE`,
          description: 'AI-powered optimal yield strategy recommendation',
        },
        '/api/analytics/:protocol': {
          price: PRICES.PROTOCOL_ANALYTICS,
          priceFormatted: `${parseInt(PRICES.PROTOCOL_ANALYTICS) / 100_000_000} MOVE`,
          description: 'Detailed protocol performance analytics',
        },
        '/api/risk/assessment': {
          price: PRICES.RISK_ASSESSMENT,
          priceFormatted: `${parseInt(PRICES.RISK_ASSESSMENT) / 100_000_000} MOVE`,
          description: 'Comprehensive portfolio risk assessment',
        },
        '/api/prices/live': {
          price: PRICES.PRICE_FEED,
          priceFormatted: `${parseInt(PRICES.PRICE_FEED) / 100_000_000} MOVE`,
          description: 'Real-time Pyth oracle price feeds',
        },
      },
      payTo: MOVEMENT_PAY_TO,
      network: 'movement',
      facilitator: X402_FACILITATOR_URL,
    },
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: '/health',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// ============================================
// SERVER STARTUP
// ============================================

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  YieldPilot x402 Signal Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Server:      http://localhost:${PORT}`);
  console.log(`  Pay-to:      ${MOVEMENT_PAY_TO}`);
  console.log(`  Facilitator: ${X402_FACILITATOR_URL}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Free Endpoints:');
  console.log('    GET /health              - Health check');
  console.log('    GET /api/protocols       - List protocols');
  console.log('    GET /api/movement/tvl    - Movement TVL');
  console.log('    GET /api/prices/summary  - Basic prices');
  console.log('    GET /api/yields          - Top yield pools');
  console.log('    GET /api/pricing         - x402 pricing info');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Premium Endpoints (x402 Protected):');
  console.log('    GET /api/signal/optimal-yield  - AI yield signal');
  console.log('    GET /api/analytics/:protocol   - Protocol analytics');
  console.log('    GET /api/risk/assessment       - Risk assessment');
  console.log('    GET /api/prices/live           - Live Pyth prices');
  console.log('═══════════════════════════════════════════════════════════');
});

export default app;
