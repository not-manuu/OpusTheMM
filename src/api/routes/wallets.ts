/**
 * 💰 Wallet Balance Routes
 *
 * Exposes live wallet balances for frontend dashboard
 */

import { Router, Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { SolanaService } from '../../services/solanaService';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

const router = Router();

let solanaService: SolanaService | null = null;

export function setWalletSolanaService(service: SolanaService): void {
  solanaService = service;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!solanaService) {
      res.status(503).json({
        success: false,
        error: 'Solana service not initialized',
      });
      return;
    }

    const creatorWallet = solanaService.loadWallet(config.creatorPrivateKey);
    const burnWallet = solanaService.loadWallet(config.burnWalletPrivateKey);

    const [creatorBalance, burnBalance] = await Promise.all([
      solanaService.getSolBalance(creatorWallet.publicKey),
      solanaService.getSolBalance(burnWallet.publicKey),
    ]);

    const volumeWallets = solanaService.loadMultipleWallets(config.volumeWalletKeys);
    const volumeBalances = await Promise.all(
      volumeWallets.map(async (wallet) => ({
        address: wallet.publicKey.toString(),
        balance: await solanaService!.getSolBalance(wallet.publicKey),
      }))
    );

    const totalVolumeBalance = volumeBalances.reduce((sum, w) => sum + w.balance, 0);

    res.json({
      success: true,
      data: {
        master: {
          address: creatorWallet.publicKey.toString(),
          balance: creatorBalance,
          label: 'Creator / Distributor',
        },
        reindeer: {
          volume: {
            label: 'Reindeer 1 - Volume',
            emoji: '❄️',
            totalBalance: totalVolumeBalance,
            wallets: volumeBalances,
          },
          buyback: {
            label: 'Reindeer 2 - Buyback & Burn',
            emoji: '🔥',
            address: burnWallet.publicKey.toString(),
            balance: burnBalance,
          },
          airdrop: {
            label: 'Reindeer 3 - Airdrops',
            emoji: '🪂',
            address: creatorWallet.publicKey.toString(),
            balance: creatorBalance,
            note: 'Shared with master wallet',
          },
          treasury: {
            label: 'Reindeer 4 - Treasury',
            emoji: '🏦',
            address: config.treasuryWalletAddress || creatorWallet.publicKey.toString(),
            balance: config.treasuryWalletAddress
              ? await solanaService.getSolBalance(new PublicKey(config.treasuryWalletAddress))
              : creatorBalance,
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get wallet balances', { error: errorMsg });
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

router.get('/fees', async (_req: Request, res: Response) => {
  try {
    if (!solanaService) {
      res.status(503).json({
        success: false,
        error: 'Solana service not initialized',
      });
      return;
    }

    if (!config.bondingCurveAddress) {
      res.json({
        success: true,
        data: {
          availableFees: 0,
          message: 'Bonding curve address not configured',
        },
      });
      return;
    }

    const bondingCurve = new PublicKey(config.bondingCurveAddress);
    const bcBalance = await solanaService.getSolBalance(bondingCurve);

    res.json({
      success: true,
      data: {
        bondingCurveAddress: config.bondingCurveAddress,
        bondingCurveBalance: bcBalance,
        claimThreshold: config.minimumClaimThreshold,
        readyToClaim: bcBalance >= config.minimumClaimThreshold,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get fee balance', { error: errorMsg });
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

export default router;
