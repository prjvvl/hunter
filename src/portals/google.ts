import { Browser, Page } from 'puppeteer';
import { Job } from '../models/job';
import { BasePortal } from './base-portal';
import logger from '../utils/logger';
import { waitForSelector } from '../services/browser';
import { cleanText, sleep } from '../utils/helper';
import { PortalConfig } from '../config';
import { sendTelegramMessage } from '../services/telegram';

export class GooglePortal extends BasePortal {
  constructor(browser: Browser, config: PortalConfig) {
    super(browser, config);
  }

  /**
   * Scrape Google jobs
   * @returns Array of job objects
   */
  async scrape(): Promise<Job[]> {
    const page = await this.openPortal();
    try {
      logger.info(`Scraping ${this.config.name}...`);
      await sleep(this.config.cooldown || 0);
      // Wait for share buttons to load
      await waitForSelector(page, 'button[aria-label^="Share"]');
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
    const jobData = await page.evaluate((config) => {
      // Find all job cards by looking for share buttons
      const shareButtons = Array.from(document.querySelectorAll('button[aria-label^="Share"]'));

      return shareButtons
        .map((shareButton) => {
          // Navigate up to find the job card container
          let jobCard = shareButton.closest('li');
          if (!jobCard) return null;

          // Find job title (h3 element within the job card)
          const titleElement = jobCard.querySelector('h3');
          const title = titleElement ? titleElement.textContent || '' : '';

          // Find "Learn more" link
          const learnMoreLink = jobCard.querySelector('a[aria-label^="Learn more about"]');
          const linkHref = learnMoreLink ? learnMoreLink.getAttribute('href') : '';
          const link = linkHref
            ? linkHref.startsWith('http')
              ? linkHref
              : `https://www.google.com/about/careers/applications/${linkHref}`
            : '';

          // Check if both title and link are present
          if (!title || !link) return null;

          // Find location by first locating the place icon
          const placeIcons = Array.from(jobCard.querySelectorAll('i[aria-hidden="true"]')).filter(
            (icon) => icon.textContent?.includes('place')
          );

          let location = '';
          if (placeIcons.length > 0) {
            // The place icon's parent element typically contains the icon and location text
            const placeIcon = placeIcons[0];
            const locationContainer = placeIcon.closest('span');

            if (locationContainer) {
              // Get all the text within the container but exclude the 'place' text from the icon
              location = locationContainer.textContent?.replace('place', '').trim() || '';
            } else {
              // Fallback: get the next sibling elements which should contain location info
              let nextSibling = placeIcon.nextElementSibling;
              while (nextSibling) {
                location += nextSibling.textContent || '';
                nextSibling = nextSibling.nextElementSibling;
              }
            }
          }

          return { title, location, link };
        })
        .filter((item) => item !== null); // Remove any null entries
    }, this.config);

    return jobData
      .map((data) => {
        if (!data) return null;

        // Additional check to ensure title and link are present and non-empty
        if (!data.title.trim() || !data.link.trim()) return null;

        return Job.fromRawData({
          title: cleanText(data.title),
          location: cleanText(data.location),
          link: data.link,
          company: 'Google',
          jobId: data.link.split('-').slice(-1)[0] || '', // Extract ID from end of link
          postedDate: '',
          description: '',
        });
      })
      .filter((job): job is Job => job !== null);
  }
}
