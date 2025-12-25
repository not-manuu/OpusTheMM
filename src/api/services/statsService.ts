/**
 * 📊 Stats Service
 *
 * Aggregates statistics from all bot modules
 */

import { logger } from '../../utils/logger';
import {
  FeeStats,
  VolumeStats,
  BurnStats,
  AirdropStats,
  TreasuryStats,
} from '../../types';

interface BotModules {
  feeCollector?: {
    getStats(): FeeStats;
    getTreasuryStats(): TreasuryStats;
    isActive(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
  };
  volumeCreator?: {
    getStats(): VolumeStats;
  };
  buybackBurner?: {
    getStats(): BurnStats;
  };
  airdropDistributor?: {
    getStats(): AirdropStats;
  };
}

interface BotStatus {
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  modules: {
    feeCollector: boolean;
    volumeCreator: boolean;
    buybackBurner: boolean;
    airdropDistributor: boolean;
  };
}

class StatsService {
  private modules: BotModules = {};
  private isPaused: boolean = false;
  private startTime: Date | null = null;

  setModules(modules: BotModules): void {
    this.modules = modules;
    this.startTime = new Date();
    logger.debug('Stats service modules set');
  }

  getComprehensiveStats(): Record<string, unknown> {
    const feeStats = this.getFeeStats();
    const volumeStats = this.getVolumeStats();
    const burnStats = this.getBurnStats();
    const airdropStats = this.getAirdropStats();
    const treasuryStats = this.getTreasuryStats();

    return {
      fees: {
        totalCollected: feeStats?.totalCollected || 0,
        claimCount: feeStats?.claimCount || 0,
        lastClaimTime: feeStats?.lastClaimTime || null,
        lastClaimAmount: feeStats?.lastClaimAmount || 0,
      },
      volume: {
        totalVolume: volumeStats?.totalVolume || 0,
        tradeCount: volumeStats?.tradeCount || 0,
        successRate:
          volumeStats && volumeStats.tradeCount > 0
            ? (volumeStats.successfulTrades / volumeStats.tradeCount) * 100
            : 0,
        lastTradeTime: volumeStats?.lastTradeTime || null,
      },
      burns: {
        totalTokensBurned: burnStats?.totalBurned || 0,
        totalSolSpent: burnStats?.totalSolSpent || 0,
        burnCount: burnStats?.burnCount || 0,
      },
      airdrops: {
        totalDistributed: airdropStats?.totalDistributed || 0,
        distributionCount: airdropStats?.distributionCount || 0,
        uniqueRecipients: airdropStats?.uniqueRecipients?.size || 0,
      },
      treasury: {
        totalReceived: treasuryStats?.totalReceived || 0,
        transferCount: treasuryStats?.transferCount || 0,
      },
      distribution: {
        volume: '25%',
        buyback: '25%',
        airdrop: '25%',
        treasury: '25%',
      },
      status: this.getBotStatus(),
    };
  }

  getFeeStats(): FeeStats | null {
    if (!this.modules.feeCollector) {
      return null;
    }
    return this.modules.feeCollector.getStats();
  }

  getVolumeStats(): VolumeStats | null {
    if (!this.modules.volumeCreator) {
      return null;
    }
    return this.modules.volumeCreator.getStats();
  }

  getBurnStats(): BurnStats | null {
    if (!this.modules.buybackBurner) {
      return null;
    }
    return this.modules.buybackBurner.getStats();
  }

  getAirdropStats(): AirdropStats | null {
    if (!this.modules.airdropDistributor) {
      return null;
    }
    return this.modules.airdropDistributor.getStats();
  }

  getTreasuryStats(): TreasuryStats | null {
    if (!this.modules.feeCollector) {
      return null;
    }
    return this.modules.feeCollector.getTreasuryStats();
  }

  getBotStatus(): BotStatus {
    return {
      isRunning: this.modules.feeCollector?.isActive() || false,
      isPaused: this.isPaused,
      startTime: this.startTime,
      modules: {
        feeCollector: !!this.modules.feeCollector,
        volumeCreator: !!this.modules.volumeCreator,
        buybackBurner: !!this.modules.buybackBurner,
        airdropDistributor: !!this.modules.airdropDistributor,
      },
    };
  }

  async pauseBot(): Promise<{ paused: boolean }> {
    if (this.isPaused) {
      return { paused: true };
    }

    if (this.modules.feeCollector) {
      await this.modules.feeCollector.stop();
    }

    this.isPaused = true;
    logger.info('Bot operations paused');

    return { paused: true };
  }

  async resumeBot(): Promise<{ resumed: boolean }> {
    if (!this.isPaused) {
      return { resumed: true };
    }

    if (this.modules.feeCollector) {
      await this.modules.feeCollector.start();
    }

    this.isPaused = false;
    logger.info('Bot operations resumed');

    return { resumed: true };
  }

  async emergencyStop(): Promise<{ stopped: boolean }> {
    logger.warn('Emergency stop triggered');

    if (this.modules.feeCollector) {
      await this.modules.feeCollector.stop();
    }

    this.isPaused = true;

    return { stopped: true };
  }
}

export const statsService = new StatsService();
