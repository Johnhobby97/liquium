/**
 * FTSO Price Service
 * Fetches price data from Flare Time Series Oracle
 */
import { createPublicClient, http, type Address } from 'viem';
import { createModuleLogger } from '../../utils/logger';
import { CHAINS } from '../../config/chains';
import { FTSO_CONFIG } from '../../config/contracts';
import { getPrismaClient } from '../database/prisma';

const logger = createModuleLogger('ftso');
const prisma = getPrismaClient();

// FTSO Registry ABI (simplified)
const FTSO_REGISTRY_ABI = [
  {
    name: 'getCurrentPriceWithDecimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_symbol', type: 'string' }],
    outputs: [
      { name: '_price', type: 'uint256' },
      { name: '_timestamp', type: 'uint256' },
      { name: '_decimals', type: 'uint256' },
    ],
  },
  {
    name: 'getSupportedSymbols',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string[]' }],
  },
] as const;

/**
 * FTSO Price Service for fetching oracle prices
 */
export class FTSOPriceService {
  private client: any;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // Create public client for reading
    this.client = createPublicClient({
      chain: {
        id: CHAINS.flare.id,
        name: CHAINS.flare.name,
        network: 'flare',
        nativeCurrency: CHAINS.flare.nativeCurrency,
        rpcUrls: {
          default: { http: [CHAINS.flare.rpcUrl] },
          public: { http: [CHAINS.flare.rpcUrl] },
        },
      },
      transport: http(CHAINS.flare.rpcUrl),
    });
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<{
    price: bigint;
    timestamp: number;
    decimals: number;
  }> {
    try {
      const result = await this.client.readContract({
        address: FTSO_CONFIG.registryAddress as Address,
        abi: FTSO_REGISTRY_ABI,
        functionName: 'getCurrentPriceWithDecimals',
        args: [symbol.toUpperCase()],
      });

      const [price, timestamp, decimals] = result;

      logger.debug('Fetched FTSO price', {
        symbol,
        price: price.toString(),
        timestamp: Number(timestamp),
        decimals: Number(decimals),
      });

      return {
        price,
        timestamp: Number(timestamp),
        decimals: Number(decimals),
      };
    } catch (error) {
      logger.error('Failed to fetch FTSO price', { symbol, error });
      throw error;
    }
  }

  /**
   * Get and save price to database
   */
  async fetchAndSavePrice(symbol: string, tokenAddress?: string) {
    try {
      const { price, timestamp, decimals } = await this.getPrice(symbol);

      // Convert price to decimal (assuming 18 decimals for storage)
      const priceDecimal = Number(price) / Math.pow(10, decimals);

      // Save to database
      await prisma.priceHistory.create({
        data: {
          tokenSymbol: symbol.toUpperCase(),
          tokenAddress,
          price: priceDecimal,
          source: 'FTSO',
          chainId: BigInt(CHAINS.flare.id),
          timestamp: new Date(timestamp * 1000),
        },
      });

      logger.info('Price saved to database', {
        symbol,
        price: priceDecimal,
      });

      return { symbol, price: priceDecimal, timestamp };
    } catch (error) {
      logger.error('Failed to fetch and save price', { symbol, error });
      throw error;
    }
  }

  /**
   * Get supported symbols
   */
  async getSupportedSymbols(): Promise<string[]> {
    try {
      const symbols = await this.client.readContract({
        address: FTSO_CONFIG.registryAddress as Address,
        abi: FTSO_REGISTRY_ABI,
        functionName: 'getSupportedSymbols',
      });

      logger.info('Supported FTSO symbols', { count: symbols.length, symbols });
      return symbols;
    } catch (error) {
      logger.error('Failed to fetch supported symbols', error);
      throw error;
    }
  }

  /**
   * Start automatic price fetching
   */
  startPriceFetching(symbols: string[] = ['BTC', 'ETH', 'FLR']) {
    if (this.isRunning) {
      logger.warn('Price fetching already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting FTSO price fetching', {
      symbols,
      interval: `${FTSO_CONFIG.updateInterval / 1000}s`,
    });

    // Fetch immediately
    this.fetchPrices(symbols);

    // Then fetch at intervals
    this.intervalId = setInterval(() => {
      this.fetchPrices(symbols);
    }, FTSO_CONFIG.updateInterval);
  }

  /**
   * Stop automatic price fetching
   */
  stopPriceFetching() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Stopped FTSO price fetching');
  }

  /**
   * Fetch multiple prices
   */
  private async fetchPrices(symbols: string[]) {
    logger.debug('Fetching FTSO prices', { symbols });

    for (const symbol of symbols) {
      try {
        await this.fetchAndSavePrice(symbol);
      } catch (error) {
        logger.error('Failed to fetch price', { symbol, error });
      }
    }
  }

  /**
   * Get latest price from database
   */
  async getLatestPrice(symbol: string) {
    return await prisma.priceHistory.findFirst({
      where: { tokenSymbol: symbol.toUpperCase() },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get price history
   */
  async getPriceHistory(symbol: string, limit = 100) {
    return await prisma.priceHistory.findMany({
      where: { tokenSymbol: symbol.toUpperCase() },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

// Export singleton instance
export const ftsoService = new FTSOPriceService();
