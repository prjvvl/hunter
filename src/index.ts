import { Job } from './models/job';
import config from './config';
import logger from './utils/logger';
import { ensureDirectoryExists, getTimestampString } from './utils/helper';
import { closeBrowser, setupBrowser } from './services/browser';
import { fetchNewJobOpenings, updateJobsDatabase } from './services/csv-database';
import { sendJobsSummary, sendTelegramMessage } from './services/telegram';
import { AmazonPortal } from './portals';
import { BasePortal } from './portals/base-portal';
import { getScheduleDescription, initScheduler } from './services/scheduler';

// Ensure output directory exists
ensureDirectoryExists(config.outputDir);

/**
 * Main scraping function
 * @returns Promise that resolves when scraping is complete
 */
export async function scrapeJobs(): Promise<void> {
  try {
    // Setup browser instance
    const browser = await setupBrowser();
    let allJobs: Job[] = [];

    for (const task of config.tasks) {
      if (!task.scrape) continue;
      let portal: BasePortal | null = null;
      switch (task.type) {
        case 'amazon':
          portal = new AmazonPortal(browser, task.name, task.url);
          break;
        default:
          throw new Error(`Invaild portal type: ${task.type}`);
      }

      try {
        logger.info(`Starting ${task.name} portal scraper...`);
        const jobs = await portal.scrape();
        logger.info(`Found ${jobs.length} jobs from ${task.name}`);
        allJobs = [...allJobs, ...jobs];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await sendTelegramMessage(`⚠️ Error scraping ${task.name}: ${errorMessage}`, 'secondary');
        logger.error(`Error scraping ${task.name} :: ${task.type}`, errorMessage);
      }
    }

    logger.info(`Scraped a total of ${allJobs.length} jobs`);

    // Close browser
    await closeBrowser(browser);

    // Update database with new jobs and get newly added jobs
    const newJobs = await fetchNewJobOpenings(allJobs);

    if (newJobs.length > 0) {
      await sendJobsSummary(newJobs);
      await sendTelegramMessage(
        `✅ Found ${newJobs.length} new openings across ${
          new Set(newJobs.map((job) => job.company)).size
        } companies.`,
        'secondary'
      );
    } else {
      logger.info('No jobs found!');
      await sendTelegramMessage('❌ No new openings found', 'secondary');
    }
    logger.info('Job scraping completed successfully. Total new jobs found:', newJobs.length);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await sendTelegramMessage(`⚠️ Error: ${errorMessage}`, 'secondary');
    logger.error('An error occurred during the scraping process', errorMessage);
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Display banner
  console.log(`
==================================================
  Job Portal Scraper
==================================================
  `);

  try {
    await sendTelegramMessage(`🚀 Hunting Started`, 'secondary');

    await scrapeJobs(); // Initial scraping

    await sendTelegramMessage(`🔄 Hunting Scheduled for ${getScheduleDescription()}`, 'secondary');

    const schedulerInitialized = initScheduler(async () => {
      await scrapeJobs();
    });

    if (schedulerInitialized) {
      logger.info(`Scheduler initialized: ${getScheduleDescription()}`);
    } else {
      logger.warn('Failed to initialize scheduler');
      process.exit(0);
    }
  } catch (error) {
    logger.error('An error occurred', { error });
    process.exit(1);
  }
}

// Run the main function if this is the main module
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error', { error });
    process.exit(1);
  });
}
