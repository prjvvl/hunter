import { Browser, Page } from 'puppeteer';
import { Job } from '../models/job';
import { BasePortal } from './base-portal';
import logger from '../utils/logger';
import { sleep } from '../utils/helper';
import { PortalConfig } from '../config';
import { sendTelegramMessage } from '../services/telegram';

export class FlipkartPortal extends BasePortal {
  private apiUrl: string;
  private searchParams: any;

  constructor(browser: Browser, config: PortalConfig) {
    super(browser, config);
    this.apiUrl = 'https://public.zwayam.com/jobs/search';

    this.searchParams = {
      paginationStartNo: 0,
      selectedCall: 'filter',
      sortCriteria: {
        name: 'modifiedDate',
        isAscending: false,
      },
      facetSelectionString: {
        Location: ['bangalore,karnataka'],
        Function: ['Technology'],
      },
      anyOfTheseWords: 'Software Engineer',
    };
  }

  /**
   * Scrape Flipkart jobs
   * @returns Array of job objects
   */
  async scrape(): Promise<Job[]> {
    const page = await this.openPortal();
    try {
      logger.info(`Scraping ${this.config.name}...`);
      await sleep(this.config.cooldown || 0);

      logger.info(`Fetching jobs from ${this.config.name} API...`);
      const jobs = await this.fetchJobsFromApi(page);
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
   * Fetch jobs from Flipkart's API
   * @param page Puppeteer page
   * @returns Array of job objects
   */
  private async fetchJobsFromApi(page: Page): Promise<Job[]> {
    logger.info(`Fetching jobs from ${this.config.name} API with parameters:`, this.searchParams);

    // Construct form data boundary exactly as in the example
    const boundary = '----WebKitFormBoundaryrpzWElwWmtRsWXbA';
    let formData = '';
    formData += `${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="filterCri"\r\n\r\n`;
    formData += `${JSON.stringify(this.searchParams)}\r\n`;
    formData += `${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="domain"\r\n\r\n`;
    formData += `www.flipkartcareers.com\r\n`;
    formData += `${boundary}--\r\n`;

    // Execute API request in the browser context
    const response = await page.evaluate(
      async (apiUrl, formData, boundary) => {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              accept: 'application/json, text/plain, */*',
              'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'content-type': `multipart/form-data; boundary=${boundary}`,
              priority: 'u=1, i',
              'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
              'sec-ch-ua-mobile': '?0',
              'sec-ch-ua-platform': '"Windows"',
              'sec-fetch-dest': 'empty',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'cross-site',
              Referer: 'https://www.flipkartcareers.com/',
              'Referrer-Policy': 'strict-origin-when-cross-origin',
            },
            body: formData,
          });

          if (!response.ok) {
            return {
              error: `HTTP error! Status: ${response.status}`,
              status: response.status,
            };
          }

          return await response.json();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { error: errorMessage };
        }
      },
      this.apiUrl,
      formData,
      boundary.substring(2) // Remove leading '--'
    );

    if (response.error) {
      throw new Error(`API request failed: ${response.error}`);
    }

    // Check if the response has the expected structure
    if (!response.code || response.code !== 200) {
      throw new Error(`Invalid API response: ${JSON.stringify(response).substring(0, 100)}...`);
    }

    // Process the API response
    return this.processApiResponse(response);
  }

  /**
   * Process the API response and convert it to Job objects
   * @param response API response object
   * @returns Array of job objects
   */
  private processApiResponse(response: any): Job[] {
    try {
      // Check the correct response structure based on the actual API response
      if (
        !response ||
        !response.data ||
        !response.data.data ||
        !Array.isArray(response.data.data)
      ) {
        logger.warn(`Unexpected response structure from ${this.config.name} API`);
        return [];
      }

      const jobsData = response.data.data;

      if (!jobsData.length) {
        logger.warn(`No jobs found in the API response for ${this.config.name}`);
        return [];
      }

      return jobsData
        .map((jobData: any) => {
          // Extract data from the _source field which contains actual job details
          const source = jobData._source;
          if (!source) {
            return null;
          }

          // Extract basic job details
          const title = source.jobTitle || '';
          const location = source.location || '';
          const refNumber = source.referenceNumber || '';

          // Format the created date
          const createdDate = source.createdDate
            ? new Date(source.createdDate).toLocaleDateString()
            : '';

          // Extract hiring manager email
          const hiringManagerEmail = source['Hiring Manager'] || '';

          // Extract skills
          const mandatorySkills = source.mandatorySkills || [];
          const desiredSkills = source.desiredSkillList || [];
          const skillsText = [...mandatorySkills, ...desiredSkills].join(', ');

          // Extract experience requirements
          const minExp = source.minYearOfExperience || '';
          const maxExp = source.maxYearOfExperience || '';
          const expRange =
            minExp && maxExp
              ? `${minExp}-${maxExp} years`
              : source.experienceUIField || source.yrsOfExperience || 'Not specified';

          // Get interview evaluation criteria
          const interviewRounds =
            source.skillsToEvaluate || (source.skillsToEvaluateList || []).join(', ') || '';

          // Construct job URL
          const link = source.jobUrl
            ? `https://www.flipkartcareers.com/#!/job-view/${source.jobUrl}`
            : '';

          return Job.fromRawData({
            title,
            location,
            jobId: refNumber,
            postedDate: createdDate,
            description: expRange + ' |' + interviewRounds,
            link,
            company: 'Flipkart',
            requirements: skillsText,
            contact: hiringManagerEmail,
          });
        })
        .filter(Boolean);
    } catch (error) {
      logger.error(`Error processing API response for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
