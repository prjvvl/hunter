// src/portals/atlassian.ts - Atlassian-specific portal
import { Browser, Page } from 'puppeteer';
import { Job } from '../models/job';
import { BasePortal } from './base-portal';
import logger from '../utils/logger';
import { waitForSelector } from '../services/browser';
import { cleanText, sleep } from '../utils/helper';
import { PortalConfig } from '../config';
import { sendTelegramMessage } from '../services/telegram';

export class AtlassianPortal extends BasePortal {
  private selectors: Record<string, string>;

  constructor(browser: Browser, config: PortalConfig) {
    super(browser, config);
    this.selectors = {
      jobContainer: 'tbody tr',
      title: 'td:first-child a',
      location: 'td:nth-child(2)',
      jobIdFromUrl: 'td:first-child a',
      link: 'td:first-child a',
    };
  }

  /**
   * Scrape Atlassian jobs
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
        const titleElement = container.querySelector(selectors.title);
        const title = titleElement?.textContent?.trim() || '';

        const location = container.querySelector(selectors.location)?.textContent?.trim() || '';

        const linkElement = container.querySelector(selectors.link);
        const relativeLink = linkElement?.getAttribute('href') || '';
        const link = relativeLink ? `https://www.atlassian.com${relativeLink}` : '';

        // Extract job ID from URL (e.g., "/company/careers/details/18639" -> "18639")
        const jobIdMatch = relativeLink.match(/\/(\d+)$/);
        const jobId = jobIdMatch ? jobIdMatch[1] : '';

        return {
          title,
          location,
          jobId,
          link,
        };
      });
    }, this.selectors);

    // Additional validation and cleaning
    return jobData
      .filter((data) => {
        const isValid = Boolean(data.title && data.link);
        if (!isValid) {
          logger.warn(
            `Dropping invalid Atlassian job: ${JSON.stringify({
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
          jobId: data.jobId,
          company: 'Atlassian',
          link: data.link,
          postedDate: '', // Atlassian doesn't show posting date on the listing page
          description: 'Engineering position at Atlassian',
          source: 'Atlassian Careers',
        })
      );
  }
}
