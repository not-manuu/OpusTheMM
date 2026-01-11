/**
 * Market Data Collector
 *
 * Aggregates market data from multiple FREE sources:
 * - Jupiter: Real-time price
 * - DexScreener: Analytics, volume, price changes (FREE!)
 * - On-chain: Bonding curve status
 */

import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaService } from '../services/solanaService';
import { logger } from '../utils/logger';
import { MarketSnapshot, MarketEvent } from './types';

// API Endpoints (ALL FREE)
const JUPITER_PRICE_API = 'https://price.jup.ag/v6/price';
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

// Request timeout in milliseconds
const API_TIMEOUT = 10000;

// API Response Types
interface JupiterPriceResponse {
  data?: {
    [key: string]: {
      price?: number;
    };
  };
}

// DexScreener API response (FREE alternative to Birdeye)
interface DexScreenerResponse {
  schemaVersion?: string;
  pairs?: DexScreenerPair[] | null;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

export class MarketDataCollector {
  private tokenAddress: PublicKey;
  private bondingCurveAddress: PublicKey;
  private solanaService: SolanaService;

  // Cache to avoid excessive API calls
  private cache: MarketSnapshot | null = null;
  private cacheExpiry: Date | null = null;
  private cacheDurationMs = 30000; // 30 second cache

  constructor(
    tokenAddress: PublicKey,
    bondingCurveAddress: PublicKey,
    solanaService: SolanaService,
    _apiKey?: string // Kept for backwards compatibility, but not used
  ) {
    this.tokenAddress = tokenAddress;
    this.bondingCurveAddress = bondingCurveAddress;
    this.solanaService = solanaService;

    logger.info('📊 Market Data Collector initialized (FREE APIs)', {
      token: tokenAddress.toString(),
      bondingCurve: bondingCurveAddress.toString(),
      dataSources: ['Jupiter (free)', 'DexScreener (free)', 'On-chain'],
    });
  }

  /**
   * Collect all market data
   * Returns cached data if fresh, otherwise fetches new data
   */
  async collect(): Promise<MarketSnapshot> {
    // Return cached if still fresh
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      logger.debug('Returning cached market data');
      return this.cache;
    }

    logger.debug('Collecting fresh market data...');

    try {
      // Fetch all data sources in parallel for speed
      const [priceData, bondingCurve, recentEvents] = await Promise.all([
        this.fetchPriceAndVolume(),
        this.fetchBondingCurveStatus(),
        this.fetchRecentEvents(),
      ]);

      const snapshot: MarketSnapshot = {
        timestamp: new Date(),
        price: {
          current: priceData.price,
          change1h: priceData.change1h,
          change24h: priceData.change24h,
          change7d: priceData.change7d,
          high24h: priceData.high24h,
          low24h: priceData.low24h,
        },
        volume: {
          volume24h: priceData.volume24h,
          volumeChange24h: priceData.volumeChange24h,
          buyVolume24h: priceData.buyVolume24h,
          sellVolume24h: priceData.sellVolume24h,
          txCount24h: priceData.txCount24h,
        },
        holders: {
          // DexScreener doesn't provide holder data, but we can estimate from txns
          total: priceData.estimatedHolders,
          change24h: 0,
          top10Percent: 0,
          top20Percent: 0,
        },
        bondingCurve,
        recentEvents,
      };

      // Cache the result
      this.cache = snapshot;
      this.cacheExpiry = new Date(Date.now() + this.cacheDurationMs);

      logger.info('📊 Market data collected', {
        price: snapshot.price.current > 0 ? snapshot.price.current.toFixed(10) : '0',
        change24h: `${snapshot.price.change24h.toFixed(2)}%`,
        volume24h: `$${snapshot.volume.volume24h.toLocaleString()}`,
        bondingProgress: `${snapshot.bondingCurve.progressPercent.toFixed(1)}%`,
      });

      return snapshot;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to collect market data', { error: errorMsg });

      // Return cached data if available, otherwise return defaults
      if (this.cache) {
        logger.warn('Returning stale cached data due to fetch error');
        return this.cache;
      }

      return this.getDefaultSnapshot();
    }
  }

  /**
   * Fetch price and volume data from Jupiter + DexScreener (both FREE)
   */
  private async fetchPriceAndVolume(): Promise<{
    price: number;
    change1h: number;
    change24h: number;
    change7d: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    volumeChange24h: number;
    buyVolume24h: number;
    sellVolume24h: number;
    txCount24h: number;
    estimatedHolders: number;
  }> {
    let price = 0;
    let change1h = 0, change24h = 0, change7d = 0;
    let high24h = 0, low24h = 0;
    let volume24h = 0, volumeChange24h = 0;
    let buyVolume24h = 0, sellVolume24h = 0, txCount24h = 0;
    let estimatedHolders = 0;

    // Try DexScreener first (has most data)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const dexRes = await fetch(
        `${DEXSCREENER_API}/${this.tokenAddress.toString()}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (dexRes.ok) {
        const dexData = (await dexRes.json()) as DexScreenerResponse;

        // Find the best pair (highest liquidity on Solana)
        const solanaPairs = dexData.pairs?.filter(p => p.chainId === 'solana') || [];
        const bestPair = solanaPairs.sort((a, b) =>
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];

        if (bestPair) {
          price = parseFloat(bestPair.priceUsd) || 0;
          change1h = bestPair.priceChange.h1 || 0;
          change24h = bestPair.priceChange.h24 || 0;
          change7d = 0; // DexScreener doesn't provide 7d change

          // Estimate high/low from price and change
          const priceYesterday = price / (1 + change24h / 100);
          high24h = Math.max(price, priceYesterday);
          low24h = Math.min(price, priceYesterday);

          volume24h = bestPair.volume.h24 || 0;

          // Calculate volume change (compare h24 to h6*4 as estimate)
          const estimatedPrevious24h = (bestPair.volume.h6 || 0) * 4;
          volumeChange24h = estimatedPrevious24h > 0
            ? ((volume24h - estimatedPrevious24h) / estimatedPrevious24h) * 100
            : 0;

          // Calculate buy/sell volumes from transaction counts
          const txns24h = bestPair.txns.h24;
          txCount24h = txns24h.buys + txns24h.sells;
          const buyRatio = txns24h.buys / Math.max(1, txCount24h);
          buyVolume24h = volume24h * buyRatio;
          sellVolume24h = volume24h * (1 - buyRatio);

          // Estimate holders from unique transactions (rough estimate)
          estimatedHolders = Math.floor(txCount24h * 0.3); // ~30% unique wallets

          logger.debug('DexScreener data fetched', {
            price,
            change24h,
            volume24h,
            txCount24h,
            liquidity: bestPair.liquidity?.usd || 0,
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMsg.includes('aborted')) {
        logger.warn('DexScreener fetch failed', { error: errorMsg });
      }
    }

    // Fallback to Jupiter for price if DexScreener failed
    if (price === 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const jupiterRes = await fetch(
          `${JUPITER_PRICE_API}?ids=${this.tokenAddress.toString()}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (jupiterRes.ok) {
          const jupiterData = (await jupiterRes.json()) as JupiterPriceResponse;
          price = jupiterData.data?.[this.tokenAddress.toString()]?.price || 0;
          logger.debug('Jupiter price fetched (fallback)', { price });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (!errorMsg.includes('aborted')) {
          logger.warn('Jupiter price fetch failed', { error: errorMsg });
        }
      }
    }

    return {
      price,
      change1h,
      change24h,
      change7d,
      high24h: high24h || price,
      low24h: low24h || price,
      volume24h,
      volumeChange24h,
      buyVolume24h,
      sellVolume24h,
      txCount24h,
      estimatedHolders,
    };
  }

  /**
   * Fetch bonding curve status from on-chain
   */
  private async fetchBondingCurveStatus(): Promise<MarketSnapshot['bondingCurve']> {
    const defaults = {
      progressPercent: 0,
      virtualSolReserves: 0,
      virtualTokenReserves: 0,
      isComplete: false,
    };

    // Skip if bonding curve address is placeholder
    if (this.bondingCurveAddress.toString() === '11111111111111111111111111111111') {
      logger.debug('Skipping bonding curve - placeholder address');
      return defaults;
    }

    try {
      const connection = this.solanaService.getConnection();
      const accountInfo = await connection.getAccountInfo(this.bondingCurveAddress);

      if (!accountInfo) {
        logger.debug('Bonding curve account not found');
        return defaults;
      }

      // Decode bonding curve data
      const data = this.decodeBondingCurve(accountInfo.data);

      // Calculate progress percentage
      // Pump.fun starts with 30 SOL virtual reserves
      // Graduates at ~85 SOL in the curve (115 SOL total virtual)
      const INITIAL_VIRTUAL_SOL = 30 * LAMPORTS_PER_SOL;
      const GRADUATION_THRESHOLD = 85 * LAMPORTS_PER_SOL;
      const currentVirtualSol = data.virtualSolReserves;
      const progress = currentVirtualSol - INITIAL_VIRTUAL_SOL;
      const progressPercent = Math.min(100, Math.max(0, (progress / GRADUATION_THRESHOLD) * 100));

      const result = {
        progressPercent,
        virtualSolReserves: data.virtualSolReserves / LAMPORTS_PER_SOL,
        virtualTokenReserves: data.virtualTokenReserves,
        isComplete: data.complete,
      };

      logger.debug('Bonding curve status fetched', {
        progressPercent: result.progressPercent.toFixed(1),
        isComplete: result.isComplete,
      });

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Bonding curve fetch failed', { error: errorMsg });
      return defaults;
    }
  }

  /**
   * Decode bonding curve account data
   * Pump.fun bonding curve structure:
   * - 8 bytes: discriminator
   * - 8 bytes: virtualTokenReserves (u64)
   * - 8 bytes: virtualSolReserves (u64)
   * - 8 bytes: realTokenReserves (u64)
   * - 8 bytes: realSolReserves (u64)
   * - 8 bytes: tokenTotalSupply (u64)
   * - 1 byte: complete (bool)
   */
  private decodeBondingCurve(data: Buffer): {
    virtualTokenReserves: number;
    virtualSolReserves: number;
    realTokenReserves: number;
    realSolReserves: number;
    tokenTotalSupply: number;
    complete: boolean;
  } {
    const DISCRIMINATOR_SIZE = 8;
    const BN_SIZE = 8;
    let offset = DISCRIMINATOR_SIZE;

    const readU64 = (): number => {
      const value = data.readBigUInt64LE(offset);
      offset += BN_SIZE;
      return Number(value);
    };

    return {
      virtualTokenReserves: readU64(),
      virtualSolReserves: readU64(),
      realTokenReserves: readU64(),
      realSolReserves: readU64(),
      tokenTotalSupply: readU64(),
      complete: data[offset] === 1,
    };
  }

  /**
   * Fetch recent significant market events
   * TODO: Implement with Helius transaction history or webhooks
   */
  private async fetchRecentEvents(): Promise<MarketEvent[]> {
    // For now, return empty array
    // Future enhancement: Use Helius enhanced transactions API
    // to detect large buys/sells, whale movements, etc.
    return [];
  }

  /**
   * Get default snapshot when data unavailable
   */
  private getDefaultSnapshot(): MarketSnapshot {
    return {
      timestamp: new Date(),
      price: {
        current: 0,
        change1h: 0,
        change24h: 0,
        change7d: 0,
        high24h: 0,
        low24h: 0,
      },
      volume: {
        volume24h: 0,
        volumeChange24h: 0,
        buyVolume24h: 0,
        sellVolume24h: 0,
        txCount24h: 0,
      },
      holders: {
        total: 0,
        change24h: 0,
        top10Percent: 0,
        top20Percent: 0,
      },
      bondingCurve: {
        progressPercent: 0,
        virtualSolReserves: 0,
        virtualTokenReserves: 0,
        isComplete: false,
      },
      recentEvents: [],
    };
  }

  /**
   * Clear cache to force fresh fetch
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = null;
    logger.debug('Market data cache cleared');
  }

  /**
   * Set cache duration
   */
  setCacheDuration(durationMs: number): void {
    this.cacheDurationMs = durationMs;
    logger.debug('Cache duration updated', { durationMs });
  }

  /**
   * Get the last cached snapshot (even if expired)
   */
  getLastSnapshot(): MarketSnapshot | null {
    return this.cache;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    return !!(this.cache && this.cacheExpiry && new Date() < this.cacheExpiry);
  }
}
