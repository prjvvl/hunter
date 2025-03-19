// src/portals/amazon.ts - Amazon-specific portal
import { Browser, Page } from 'puppeteer';
import { Job } from '../models/job';
import { BasePortal } from './base-portal';
import logger from '../utils/logger';
import { waitForSelector } from '../services/browser';
import { cleanText, sleep } from '../utils/helper';

export class AmazonPortal extends BasePortal {
  private selectors: Record<string, string>;

  constructor(browser: Browser, name: string, url: string) {
    super(browser);
    this.name = name;
    this.url = url;
    this.selectors = {
      jobContainer: '.job-tile',
      title: '.job-title',
      location: '.location-and-id li:first-child',
      jobId: '.location-and-id li:nth-child(3)',
      postedDate: '.posting-date',
      description: '.description span',
      link: '.job-title a',
    };
  }

  /**
   * Scrape Amazon jobs
   * @returns Array of job objects
   */
  async scrape(): Promise<Job[]> {
    const page = await this.openPortal();
    try {
      logger.info(`Scraping ${this.name}...`);
      // Wait for job containers to load
      await waitForSelector(page, this.selectors.jobContainer);
      // Extract jobs from current page
      logger.info(`Extracting jobs from ${this.name}...`);
      const jobs = await this.extractJobsFromPage(page);
      logger.info(`Scraped a total of ${jobs.length} jobs from ${this.name}`);
      return jobs;
    } catch (error) {
      logger.error(`Error scraping ${this.name}`, { error });
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
        const title = container.querySelector(selectors.title)?.textContent || '';
        const location = container.querySelector(selectors.location)?.textContent || '';
        const jobId = container.querySelector(selectors.jobId)?.textContent || '';
        const postedDate = container.querySelector(selectors.postedDate)?.textContent || '';
        const description = container.querySelector(selectors.description)?.textContent || '';
        const source = window.location.hostname;
        const link = container.querySelector(selectors.link)?.getAttribute('href') || '';
        return {
          title,
          location,
          jobId,
          postedDate,
          description,
          source,
          link: link.startsWith('http') ? link : `https://${source}${link}`,
        };
      });
    }, this.selectors);

    return jobData.map((data) =>
      Job.fromRawData({
        ...data,
        company: 'Amazon',
        title: cleanText(data.title),
        location: cleanText(data.location),
        jobId: cleanText(data.jobId),
        postedDate: cleanText(data.postedDate),
        description: cleanText(data.description),
      })
    );
  }
}
