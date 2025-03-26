// src/portals/nvidia.ts - NVIDIA-specific portal
import { Browser, Page } from 'puppeteer';
import { Job } from '../models/job';
import { BasePortal } from './base-portal';
import logger from '../utils/logger';
import { waitForSelector } from '../services/browser';
import { cleanText, sleep } from '../utils/helper';
import { PortalConfig } from '../config';
import { sendTelegramMessage } from '../services/telegram';

export class NvidiaPortal extends BasePortal {
  private selectors: Record<string, string>;

  constructor(browser: Browser, config: PortalConfig) {
    super(browser, config);
    this.selectors = {
      jobContainer: 'section[data-automation-id="jobResults"] > ul > li',
      title: 'a[data-automation-id="jobTitle"]',
      location: 'div[data-automation-id="locations"] dd',
      postedDate: 'div[data-automation-id="postedOn"] dd',
      jobId: 'li[data-automation-id="subtitle"]',
    };
  }

  /**
   * Scrape NVIDIA jobs
   * @returns Array of job objects
   */
  async scrape(): Promise<Job[]> {
    const page = await this.openPortal();
    try {
      logger.info(`Scraping ${this.config.name}...`);
      await sleep(this.config.cooldown || 0);

      // Wait for job containers to load
      await waitForSelector(page, this.selectors.jobContainer);

      // Extract jobs from current page
      logger.info(`Extracting jobs from ${this.config.name}...`);
      const jobs = await this.extractJobsFromPage(page);

      logger.info(`Scraped a total of ${jobs.length} jobs from ${this.config.name}`);
      return jobs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error scraping ${this.config.name}`, { errorMessage });
      const safeErrorMessage = errorMessage
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      await sendTelegramMessage(
        `⚠️ Error scraping ${this.config.name}: ${safeErrorMessage}`,
        'secondary'
      );
    } finally {
      await page.close();
    }
    return [];
  }

  /**
   * Extract jobs from current page
   * @param page Puppeteer page
   * @returns Array of job objects
   */
  private async extractJobsFromPage(page: Page): Promise<Job[]> {
    const jobData = await page.evaluate((selectors) => {
      const containers = document.querySelectorAll(selectors.jobContainer);
      return Array.from(containers).map((container) => {
        // Extract job title
        const titleElement = container.querySelector(selectors.title);
        const title = titleElement?.textContent?.trim() || '';

        // Extract job link
        const link = titleElement?.getAttribute('href') || '';

        // Extract location from the location data element
        const locationElement = container.querySelector(selectors.location);
        const location = locationElement?.textContent?.trim() || '';

        // Extract posting date
        const postedDateElement = container.querySelector(selectors.postedDate);
        const postedDate = postedDateElement?.textContent?.trim() || '';

        // Extract job ID from subtitle
        const jobIdElement = container.querySelector(selectors.jobId);
        const jobId = jobIdElement?.textContent?.trim() || '';

        return {
          title,
          location,
          jobId,
          postedDate,
          link,
        };
      });
    }, this.selectors);

    return jobData
      .filter((data) => {
        const isValid = Boolean(data.title && data.link);
        if (!isValid) {
          logger.warn(
            `Dropping invalid NVIDIA job: ${JSON.stringify({
              title: data.title || '(missing)',
              link: data.link || '(missing)',
            })}`
          );
        }
        return isValid;
      })
      .map((data) =>
        Job.fromRawData({
          title: cleanText(data.title),
          location: cleanText(data.location),
          jobId: cleanText(data.jobId),
          postedDate: cleanText(data.postedDate.replace('Posted ', '')),
          company: 'NVIDIA',
          link: data.link.startsWith('http')
            ? data.link
            : `https://nvidia.wd5.myworkdayjobs.com${data.link}`,
          source: 'NVIDIA Careers',
          description: 'Software Engineering position at NVIDIA',
        })
      );
  }
}
