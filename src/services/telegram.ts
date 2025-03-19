// src/services/telegram.ts - Telegram integration
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import config from '../config';
import logger from '../utils/logger';
import { Job } from '../models/job';
import { newJobsPath } from './csv-database';

let botInstance: TelegramBot | null = null;

/**
 * Initialize Telegram bot
 * @returns Telegram bot instance
 */
export function initTelegramBot(): TelegramBot | null {
  if (
    !config.telegram.botToken ||
    !config.telegram.primaryChannelId ||
    !config.telegram.secondaryChannelId
  ) {
    logger.warn('Telegram bot token or channel IDs not provided');
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
export async function sendTelegramMessage(
  message: string,
  channel: 'primary' | 'secondary'
): Promise<boolean> {
  const bot = initTelegramBot();
  if (!bot) {
    return false;
  }

  const channelId =
    channel === 'primary' ? config.telegram.primaryChannelId : config.telegram.secondaryChannelId;

  try {
    await bot.sendMessage(channelId, message, {
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
export async function sendTelegramFile(
  filePath: string,
  caption: string = '',
  channel: 'primary' | 'secondary'
): Promise<boolean> {
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

    const channelId =
      channel === 'primary' ? config.telegram.primaryChannelId : config.telegram.secondaryChannelId;

    // Send the file
    await bot.sendDocument(channelId, filePath, {
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
 * @returns Promise that resolves when summary is sent
 */
export async function sendJobsSummary(jobs: Job[]): Promise<boolean> {
  if (jobs.length === 0) {
    return false;
  }

  // Group jobs by company
  const groupedJobs = jobs.reduce((acc: Record<string, Job[]>, job: Job) => {
    if (!acc[job.company]) {
      acc[job.company] = [];
    }
    acc[job.company].push(job);
    return acc;
  }, {});

  // Build the message with the grouped jobs
  let messageContent = `<b>📊 Report: ${new Date().toLocaleString()}</b>`;

  const companies = Object.keys(groupedJobs);
  const maxJobsToShow = 25;
  let totalJobsShown = 0;

  let shouldBreak = false;

  // Use a standard for loop instead of forEach so we can exit early
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    messageContent += `\n\n${'-'.repeat(Math.max(0, 25 - company.length))} <b>#${company}</b>\n`;

    // Use a standard for loop for jobs too
    const companyJobs = groupedJobs[company];
    for (let j = 0; j < companyJobs.length; j++) {
      messageContent += `\n${companyJobs[j].toSummary()}\n`;
      totalJobsShown++;

      if (totalJobsShown >= maxJobsToShow) {
        shouldBreak = true;
        break;
      }
    }

    if (shouldBreak) {
      break;
    }
  }

  // Calculate total number of remaining jobs
  const remainingJobs = jobs.length - totalJobsShown;
  if (remainingJobs > 0) {
    messageContent += `\n...and ${remainingJobs} more.\n`;
    await sendTelegramMessage(messageContent.trim(), 'primary');
    return await sendTelegramFile(newJobsPath, 'Newly added openings', 'primary');
  }

  return await sendTelegramMessage(messageContent.trim(), 'primary');
}
