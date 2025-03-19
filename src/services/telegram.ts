// src/services/telegram.ts - Telegram integration
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import config from '../config';
import logger from '../utils/logger';
import { Job } from '../models/job';

let botInstance: TelegramBot | null = null;

/**
 * Initialize Telegram bot
 * @returns Telegram bot instance
 */
export function initTelegramBot(): TelegramBot | null {
  if (!config.telegram.botToken || !config.telegram.channelId) {
    logger.warn('Telegram bot token or channel ID not provided');
    return null;
  }

  if (botInstance) {
    return botInstance;
  }

  try {
    logger.info('Initializing Telegram bot');
    botInstance = new TelegramBot(config.telegram.botToken, { polling: false });
    return botInstance;
  } catch (error) {
    logger.error('Failed to initialize Telegram bot', { error });
    return null;
  }
}

/**
 * Send a message to the configured Telegram channel
 * @param message Message to send
 * @returns Promise that resolves when message is sent
 */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  const bot = initTelegramBot();
  if (!bot) {
    return false;
  }

  try {
    await bot.sendMessage(config.telegram.channelId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send Telegram message', { error });
    return false;
  }
}

/**
 * Send a file to the configured Telegram channel
 * @param filePath Path to the file to send
 * @param caption Caption for the file
 * @returns Promise that resolves when file is sent
 */
export async function sendTelegramFile(filePath: string, caption: string = ''): Promise<boolean> {
  const bot = initTelegramBot();
  if (!bot) {
    return false;
  }

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`File does not exist: ${filePath}`);
      return false;
    }

    // Send the file
    await bot.sendDocument(config.telegram.channelId, filePath, {
      caption: caption.substring(0, 1024), // Telegram limits caption to 1024 chars
      parse_mode: 'HTML',
    });
    return true;
  } catch (error) {
    logger.error('Failed to send Telegram file', { error });
    return false;
  }
}

/**
 * Send a summary of new jobs to Telegram
 * @param jobs Array of jobs to summarize
 * @param isUpdate Whether this is an update or initial scrape
 * @returns Promise that resolves when summary is sent
 */
export async function sendJobsSummary(jobs: Job[]): Promise<boolean> {
  if (jobs.length === 0) {
    return false;
  }

  const message = `
<b>📊 Report: ${new Date().toLocaleString()}</b>

${jobs.length} new openings across ${new Set(jobs.map((job) => job.company)).size} companies.

${jobs
  .slice(0, 20)
  .map((job) => job.toSummary())
  .join('\n\n')}

${jobs.length > 20 ? `\n...and ${jobs.length - 20} more.\n` : ''}
  `.trim();

  return await sendTelegramMessage(message);
}
