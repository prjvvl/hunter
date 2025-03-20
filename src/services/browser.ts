import puppeteer, { Browser, Page } from 'puppeteer';
import config from '../config';
import logger from '../utils/logger';
import { randomDelay, sleep } from '../utils/helper';

let browserInstance: Browser | null = null;

/**
 * Set up and return a browser instance
 * @returns Puppeteer browser instance
 */
export async function setupBrowser(): Promise<Browser> {
  if (browserInstance) {
    return browserInstance;
  }

  logger.info('Setting up browser instance');
  browserInstance = await puppeteer.launch(config.browser);
  return browserInstance;
}

/**
 * Close the browser instance
 * @param browser Puppeteer browser instance
 */
export async function closeBrowser(browser?: Browser): Promise<void> {
  const instance = browser || browserInstance;

  if (instance) {
    logger.info('Closing browser instance');
    await instance.close();
    browserInstance = null;
  }
}

/**
 * Create a new page with default settings
 * @param browser Puppeteer browser instance
 * @returns Puppeteer page instance
 */
export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Set viewport and timeout
  await page.setViewport({ width: 1366, height: 768 });
  page.setDefaultNavigationTimeout(30000);

  // Add some random delays for human-like behavior
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    // Allow essential resources first
    if (['document', 'script', 'xhr', 'fetch'].includes(request.resourceType())) {
      request.continue();
    } else {
      // Delay non-essential resources
      setTimeout(() => {
        request.continue();
      }, Math.floor(Math.random() * 100));
    }
  });

  return page;
}

/**
 * Navigate to a URL with retry mechanism
 * @param page Puppeteer page
 * @param url URL to navigate to
 * @param maxRetries Maximum number of retries
 * @returns Promise that resolves when navigation is complete
 */
export async function navigateToUrl(
  page: Page,
  url: string,
  maxRetries: number = 3
): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      logger.debug(`Navigating to ${url}`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      return;
    } catch (error) {
      retries++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Navigation failed (attempt ${retries}/${maxRetries}): ${errorMessage}`);

      if (retries >= maxRetries) {
        throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts`);
      }

      // Wait before retrying
      await sleep(randomDelay(3000, 5000));
    }
  }
}

/**
 * Wait for selector with timeout and retry
 * @param page Puppeteer page
 * @param selector CSS selector to wait for
 * @param timeout Timeout in milliseconds
 * @param maxRetries Maximum number of retries
 * @returns True if selector was found
 */
export async function waitForSelector(
  page: Page,
  selector: string,
  timeout: number = 10000,
  maxRetries: number = 3
): Promise<boolean> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      retries++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.debug(
        `Selector "${selector}" not found (attempt ${retries}/${maxRetries}): ${errorMessage}`
      );

      if (retries >= maxRetries) {
        logger.warn(`Selector "${selector}" not found after ${maxRetries} attempts`);
        return false;
      }

      // Wait before retrying
      await sleep(randomDelay(1000, 2000));
    }
  }

  return false;
}

/**
 * Extract text from element
 * @param page Puppeteer page
 * @param selector CSS selector
 * @param options Options for text extraction
 * @returns Extracted text
 */
export async function extractText(
  page: Page,
  selector: string,
  options: { trim?: boolean; defaultValue?: string } = {}
): Promise<string> {
  const defaultOptions = {
    trim: true,
    defaultValue: '',
  };

  const opts = { ...defaultOptions, ...options };

  try {
    const text = await page.$eval(selector, (el) => el.textContent || '');
    return opts.trim ? text.trim() : text;
  } catch (error) {
    return opts.defaultValue;
  }
}

/**
 * Extract attribute from element
 * @param page Puppeteer page
 * @param selector CSS selector
 * @param attribute Attribute name
 * @param defaultValue Default value if attribute is not found
 * @returns Attribute value
 */
export async function extractAttribute(
  page: Page,
  selector: string,
  attribute: string,
  defaultValue: string = ''
): Promise<string> {
  try {
    return await page.$eval(selector, (el, attr) => el.getAttribute(attr) || '', attribute);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Click an element with retry mechanism
 * @param page Puppeteer page
 * @param selector CSS selector
 * @param maxRetries Maximum number of retries
 * @returns True if click was successful
 */
export async function clickElement(
  page: Page,
  selector: string,
  maxRetries: number = 3
): Promise<boolean> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Wait for the element to be available
      await page.waitForSelector(selector, { timeout: 10000 });

      // Click the element
      await page.click(selector);

      // Introduce random delay to mimic human behavior
      await sleep(randomDelay());

      return true;
    } catch (error) {
      retries++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.debug(
        `Click failed for "${selector}" (attempt ${retries}/${maxRetries}): ${errorMessage}`
      );

      if (retries >= maxRetries) {
        logger.warn(`Failed to click "${selector}" after ${maxRetries} attempts`);
        return false;
      }

      // Wait before retrying
      await sleep(randomDelay(1000, 2000));
    }
  }

  return false;
}
