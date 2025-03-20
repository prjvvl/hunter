import { Browser, Page } from 'puppeteer';
import { Job } from '../models/job';
import { BasePortal } from './base-portal';
import logger from '../utils/logger';
import { waitForSelector } from '../services/browser';
import { cleanText, sleep } from '../utils/helper';
import { PortalConfig } from '../config';
import { sendTelegramMessage } from '../services/telegram';

export class MicrosoftPortal extends BasePortal {
  private selectors: Record<string, string>;

  constructor(browser: Browser, config: PortalConfig) {
    super(browser, config);
    this.selectors = {
      jobContainer: 'div[role="listitem"]',
      jobCard: 'div[role="group"].ms-DocumentCard',
      title: 'h2',
      location: 'i[data-icon-name="POI"] + span',
      postedDate: 'i[data-icon-name="Clock"] + span',
      workMode: 'i[data-icon-name="AddHome"] + span',
      description: 'span[aria-label="job description"]',
      detailsLink: 'button[aria-label^="click to see details"]',
      jobItem: 'div[aria-label^="Job item"]', // For job ID extraction
    };
  }

  /**
   * Scrape Microsoft jobs
   * @returns Array of job objects
   */
  async scrape(): Promise<Job[]> {
    const page = await this.openPortal();
    try {
      logger.info(`Scraping ${this.config.name}...`);
      await sleep(this.config.cooldown || 0);
      // Wait for job containers to load
      await waitForSelector(page, this.selectors.jobContainer);

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
    const jobData = await page.evaluate(
      (selectors, config) => {
        const containers = document.querySelectorAll(selectors.jobContainer);
        return Array.from(containers).map((container) => {
          const jobItemElement = container.querySelector(selectors.jobItem);
          const jobIdMatch = jobItemElement?.getAttribute('aria-label')?.match(/Job item (\d+)/);
          const jobId = jobIdMatch ? jobIdMatch[1] : '';

          const title = container.querySelector(selectors.title)?.textContent?.trim() || '';
          const location = container.querySelector(selectors.location)?.textContent?.trim() || '';
          const postedDate =
            container.querySelector(selectors.postedDate)?.textContent?.trim() || '';
          const workMode = container.querySelector(selectors.workMode)?.textContent?.trim() || '';
          const description =
            container.querySelector(selectors.description)?.textContent?.trim() || '';

          const jobUrl = jobId ? `https://careers.microsoft.com/us/en/job/${jobId}` : '';

          return {
            title,
            location,
            jobId,
            postedDate,
            workMode,
            description,
            link: jobUrl,
          };
        });
      },
      this.selectors,
      this.config
    );

    // Additional validation check on the Node.js side
    const validJobs = jobData
      .filter((data) => {
        const isValid = Boolean(data.title && data.jobId && data.link);
        if (!isValid) {
          logger.warn(
            `Dropping invalid job: ${JSON.stringify({
              title: data.title || '(missing)',
              jobId: data.jobId || '(missing)',
              link: data.link || '(missing)',
            })}`
          );
        }
        return isValid;
      })
      .map((data) =>
        Job.fromRawData({
          ...data,
          company: 'Microsoft',
          title: cleanText(data.title),
          location: cleanText(data.location),
          jobId: cleanText(data.jobId),
          postedDate: cleanText(data.postedDate),
          description: cleanText(data.description),
          workMode: cleanText(data.workMode),
        })
      );

    if (jobData.length !== validJobs.length) {
      logger.info(
        `Filtered out ${
          jobData.length - validJobs.length
        } invalid jobs with missing required fields`
      );
    }

    return validJobs;
  }
}
