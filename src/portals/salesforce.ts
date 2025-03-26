// src/portals/salesforce.ts - Salesforce-specific portal
import { Browser, Page } from 'puppeteer';
import { Job } from '../models/job';
import { BasePortal } from './base-portal';
import logger from '../utils/logger';
import { waitForSelector } from '../services/browser';
import { cleanText, sleep } from '../utils/helper';
import { PortalConfig } from '../config';
import { sendTelegramMessage } from '../services/telegram';

export class SalesforcePortal extends BasePortal {
  private selectors: Record<string, string>;

  constructor(browser: Browser, config: PortalConfig) {
    super(browser, config);
    this.selectors = {
      jobContainer: '.card.card-job',
      title: '.card-title a',
      subtitle: '.card-subtitle',
      location: '.list-inline.locations li',
      jobIdFromData: '.card-job-actions.js-job',
      link: '.card-title a',
    };
  }

  /**
   * Scrape Salesforce jobs
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

        // Extract job category/department
        const subtitleElement = container.querySelector(selectors.subtitle);
        const department = subtitleElement?.textContent?.trim() || '';

        // Extract locations
        const locationElements = container.querySelectorAll(selectors.location);
        const locations = Array.from(locationElements)
          .map((el) => el.textContent?.trim() || '')
          .filter((loc) => loc.includes('Bangalore') || loc.includes('India'))
          .join(', ');

        // Extract job ID from data attribute
        const jobActionElement = container.querySelector(selectors.jobIdFromData);
        const jobId = jobActionElement?.getAttribute('data-id') || '';

        // Extract job link
        const linkElement = container.querySelector(selectors.link);
        const relativeLink = linkElement?.getAttribute('href') || '';
        // Add base URL if it's a relative path
        const link = relativeLink
          ? relativeLink.startsWith('http')
            ? relativeLink
            : `https://careers.salesforce.com${relativeLink}`
          : '';

        return {
          title,
          department,
          location: locations,
          jobId,
          link,
        };
      });
    }, this.selectors);

    // Additional validation and transformation to Job objects
    return jobData
      .filter((data) => {
        // Filter out jobs that don't have required fields
        const isValid = Boolean(data.title && data.link && data.jobId);
        if (!isValid) {
          logger.warn(
            `Dropping invalid Salesforce job: ${JSON.stringify({
              title: data.title || '(missing)',
              link: data.link || '(missing)',
              jobId: data.jobId || '(missing)',
            })}`
          );
        }

        // Also filter for Bangalore jobs only if there's a location string
        const isBangalore =
          !data.location ||
          data.location.toLowerCase().includes('bangalore') ||
          data.location.toLowerCase().includes('bengaluru');

        return isValid && isBangalore;
      })
      .map((data) =>
        Job.fromRawData({
          title: cleanText(data.title),
          location: cleanText(data.location || 'Bangalore, India'),
          jobId: data.jobId,
          company: 'Salesforce',
          link: data.link,
          postedDate: '', // Salesforce doesn't show posting date in the listing
          description: cleanText(data.department || 'Software Engineering'),
          source: 'Salesforce Careers',
        })
      );
  }
}
