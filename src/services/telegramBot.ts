/**
 * 🤖 Telegram Bot Service
 *
 * Sends notifications and alerts to Telegram admins
 */

import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export interface TelegramNotification {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private adminChatIds: number[] = [];
  private isEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!config.telegramBotToken) {
      logger.info('Telegram bot token not configured, notifications disabled');
      return;
    }

    if (!config.telegramAdminChatIds || config.telegramAdminChatIds.length === 0) {
      logger.warn('Telegram admin chat IDs not configured');
      return;
    }

    try {
      this.bot = new TelegramBot(config.telegramBotToken, { polling: false });
      this.adminChatIds = config.telegramAdminChatIds;

      this.isEnabled = true;
      logger.info('🤖 Telegram bot initialized', {
        adminCount: this.adminChatIds.length,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to initialize Telegram bot', { error: errorMsg });
    }
  }

  /**
   * Send notification to all admin chats
   */
  async sendNotification(notification: TelegramNotification): Promise<void> {
    if (!this.isEnabled || !this.bot) {
      logger.debug('Telegram notifications disabled, skipping');
      return;
    }

    const emoji = this.getEmoji(notification.type || 'info');
    const formattedMessage = `${emoji} ${notification.message}`;

    const promises = this.adminChatIds.map((chatId) =>
      this.sendToChat(chatId, formattedMessage)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send message to specific chat
   */
  private async sendToChat(chatId: number, message: string): Promise<void> {
    if (!this.bot) return;

    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });
      logger.debug('Telegram message sent', { chatId: chatId.toString().slice(0, 8) + '...' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Failed to send Telegram message', {
        chatId: chatId.toString().slice(0, 8) + '...',
        error: errorMsg,
      });
    }
  }

  /**
   * Send fee collection notification
   */
  async notifyFeeCollected(amount: number, signature: string): Promise<void> {
    const message = `
*💰 Fee Collected*

Amount: \`${amount.toFixed(6)}\` SOL
Signature: \`${signature.slice(0, 16)}...\`

Distribution: 25% each to Volume, Buyback, Airdrop, Treasury
    `.trim();

    await this.sendNotification({ message, type: 'success' });
  }

  /**
   * Send volume creation notification
   */
  async notifyVolumeCreated(amount: number, trades: number): Promise<void> {
    const message = `
*📈 Volume Created*

Amount: \`${amount.toFixed(6)}\` SOL
Trades: ${trades}
Reindeer: Volume Creator
    `.trim();

    await this.sendNotification({ message, type: 'info' });
  }

  /**
   * Send buyback & burn notification
   */
  async notifyBurn(tokens: number, sol: number, signature: string): Promise<void> {
    const message = `
*🔥 Buyback & Burn*

Tokens Burned: \`${tokens.toLocaleString()}\`
SOL Spent: \`${sol.toFixed(6)}\`
Signature: \`${signature.slice(0, 16)}...\`
Reindeer: Buyback & Burn
    `.trim();

    await this.sendNotification({ message, type: 'success' });
  }

  /**
   * Send airdrop notification
   */
  async notifyAirdrop(amount: number, recipients: number): Promise<void> {
    const message = `
*🎁 Airdrop Distributed*

Amount: \`${amount.toFixed(6)}\` SOL
Recipients: ${recipients}
Reindeer: Airdrop Distributor
    `.trim();

    await this.sendNotification({ message, type: 'success' });
  }

  /**
   * Send treasury transfer notification
   */
  async notifyTreasury(amount: number, signature: string): Promise<void> {
    const message = `
*🏦 Treasury Transfer*

Amount: \`${amount.toFixed(6)}\` SOL
Signature: \`${signature.slice(0, 16)}...\`
Reindeer: Treasury
    `.trim();

    await this.sendNotification({ message, type: 'info' });
  }

  /**
   * Send error notification
   */
  async notifyError(errorMessage: string, context?: string): Promise<void> {
    const message = `
*❌ Error*

${context ? `Context: ${context}\n` : ''}Error: ${errorMessage}
    `.trim();

    await this.sendNotification({ message, type: 'error' });
  }

  /**
   * Send bot status notification
   */
  async notifyBotStatus(status: 'started' | 'stopped' | 'paused' | 'resumed'): Promise<void> {
    const statusMessages = {
      started: '🚀 *Bot Started*\n\nFrostbyte is now operational!',
      stopped: '🛑 *Bot Stopped*\n\nAll operations have been halted.',
      paused: '⏸️ *Bot Paused*\n\nOperations temporarily paused.',
      resumed: '▶️ *Bot Resumed*\n\nOperations have resumed.',
    };

    await this.sendNotification({
      message: statusMessages[status],
      type: status === 'stopped' || status === 'paused' ? 'warning' : 'info',
    });
  }

  /**
   * Send daily stats summary
   */
  async sendDailyStats(stats: {
    fees: number;
    volume: number;
    burned: number;
    airdropped: number;
    treasury: number;
  }): Promise<void> {
    const message = `
*📊 Daily Summary*

Fees Collected: \`${stats.fees.toFixed(6)}\` SOL
Volume Created: \`${stats.volume.toFixed(6)}\` SOL
Tokens Burned: ${stats.burned.toLocaleString()}
Airdrops: \`${stats.airdropped.toFixed(6)}\` SOL
Treasury: \`${stats.treasury.toFixed(6)}\` SOL
    `.trim();

    await this.sendNotification({ message, type: 'info' });
  }

  /**
   * Get emoji for notification type
   */
  private getEmoji(type: 'info' | 'success' | 'warning' | 'error'): string {
    const emojis = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };
    return emojis[type] || 'ℹ️';
  }

  /**
   * Check if bot is enabled
   */
  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Get admin count
   */
  getAdminCount(): number {
    return this.adminChatIds.length;
  }
}

// Singleton instance
export const telegramBot = new TelegramBotService();
