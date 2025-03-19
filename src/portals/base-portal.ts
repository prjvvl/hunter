// src/portals/base-portal.ts - Base class for portal scrapers
import { Browser, Page } from 'puppeteer';
import { Job } from '../models/job';
import logger from '../utils/logger';
import { createPage, navigateToUrl } from '../services/browser';
import { randomDelay, sleep } from '../utils/helper';

export abstract class BasePortal {
  protected browser: Browser;
  protected name: string;
  protected url: string;
  protected jobCount: number;

  /**
   * Create a new portal scraper instance
   * @param browser Puppeteer browser instance
   */
  constructor(browser: Browser) {
    if (this.constructor === BasePortal) {
      throw new Error('BasePortal is an abstract class and cannot be instantiated directly');
    }

    this.browser = browser;
    this.name = 'Base Portal';
    this.url = '';
    this.jobCount = 0;
  }

  /**
   * Main scraping method - should be implemented by subclasses
   * @returns Array of job objects
   */
  abstract scrape(): Promise<Job[]>;

  /**
   * Open portal website and get a page instance
   * @returns Puppeteer page instance
   */
  protected async openPortal(): Promise<Page> {
    const page = await createPage(this.browser);

    try {
      logger.info(`Opening portal: ${this.name} (${this.url})`);
      await navigateToUrl(page, this.url);
      return page;
    } catch (error) {
      await page.close();
      throw new Error(`Failed to open ${this.name} portal: ${error}`);
    }
  }

  /**
   * Wait for a random amount of time
   * @returns Promise that resolves after wait
   */
  protected async wait(): Promise<void> {
    await sleep(randomDelay());
  }
}
