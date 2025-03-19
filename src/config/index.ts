import dotenv from 'dotenv';

dotenv.config();

export type portalType = 'amazon';

// Portal configuration
export interface PortalConfig {
  name: string;
  url: string;
  scrape: boolean;
  type: portalType;
}

// Global configuration
export interface Config {
  browser: {
    headless: boolean;
    defaultViewport: null;
    args: string[];
    ignoreHTTPSErrors: boolean;
  };
  tasks: PortalConfig[];
  telegram: {
    botToken: string;
    primaryChannelId: string;
    secondaryChannelId: string;
  };
  outputDir: string;
  logDir: string;
  logLevel: string;
  scheduleCron: string;
}

const HEADLESS: boolean = true;
const OUTPUT_DIR: string = './data';
const LOG_DIR: string = './logs';
const LOG_LEVEL: string = 'info';
const SCHEDULE_CRON: string = '0 8,10,13,16,19,22 * * *'; // 6 times a day at 8am, 10am, 1pm, 4pm, 7pm, 10pm

const config: Config = {
  browser: {
    headless: HEADLESS,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-notifications',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    ignoreHTTPSErrors: true,
  },
  tasks: [
    {
      name: 'Amazon - SDE Bangalore',
      type: 'amazon',
      url: 'https://www.amazon.jobs/en-gb/location/bangalore-india?offset=0&result_limit=10&sort=recent&category%5B%5D=software-development&job_type%5B%5D=Full-Time&city%5B%5D=Bengaluru&distanceType=Mi&radius=24km&location%5B%5D=bangalore-india&latitude=&longitude=&loc_group_id=&loc_query=&base_query=&city=&country=&region=&county=&query_options=&',
      scrape: true,
    },
  ],
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    primaryChannelId: process.env.TELEGRAM_PRIMARY_CHANNEL_ID || '',
    secondaryChannelId: process.env.TELEGRAM_SECONDARY_CHANNEL_ID || '',
  },
  outputDir: OUTPUT_DIR,
  logDir: LOG_DIR,
  logLevel: LOG_LEVEL,
  scheduleCron: SCHEDULE_CRON,
};

export default config;
