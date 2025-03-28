import dotenv from 'dotenv';

dotenv.config();

export type portalType =
  | 'amazon'
  | 'google'
  | 'microsoft'
  | 'flipkart'
  | 'atlassian'
  | 'salesforce'
  | 'nvidia';

// Portal configuration
export interface PortalConfig {
  name: string;
  url: string;
  scrape: boolean;
  type: portalType;
  cooldown?: number; // In milliseconds
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
const SCHEDULE_CRON: string = '0 9,14,20 * * *'; // 3 times a day at 9am, 2pm, and 8pm

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
      cooldown: 2000,
    },
    {
      name: 'Google - SDE Bangalore',
      type: 'google',
      url: 'https://www.google.com/about/careers/applications/jobs/results/?location=Bangalore%20India&employment_type=FULL_TIME&q=%22Software%20Engineer%22&target_level=EARLY&sort_by=date',
      scrape: true,
      cooldown: 2000,
    },
    {
      name: 'Microsoft - SDE Bangalore',
      type: 'microsoft',
      url: 'https://jobs.careers.microsoft.com/global/en/search?q=software%20engineer&lc=Bangalore%2C%20Karnataka%2C%20India&p=Software%20Engineering&d=Software%20Engineering&rt=Individual%20Contributor&et=Full-Time&l=en_us&pg=1&pgSz=20&o=Recent&flt=true',
      scrape: true,
      cooldown: 5000,
    },
    {
      name: 'Flipkart - SDE Bangalore',
      type: 'flipkart',
      url: 'https://www.flipkartcareers.com/#!/joblist',
      scrape: true,
      cooldown: 1000,
    },
    {
      name: 'Atlassian - SDE Bangalore',
      type: 'atlassian',
      url: 'https://www.atlassian.com/company/careers/all-jobs?team=Engineering&location=India&search=software%20engineer',
      scrape: true,
      cooldown: 2000,
    },
    {
      name: 'Salesforce - SDE Bangalore',
      type: 'salesforce',
      url: 'https://careers.salesforce.com/en/jobs/?search=software+engineer&country=India&region=Karnataka&location=Bangalore&team=Software+Engineering&type=Full+time&pagesize=50#results',
      scrape: true,
      cooldown: 2000,
    },
    {
      name: 'NVIDIA - SDE Bangalore',
      type: 'nvidia',
      url: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?q=software%20engineer&locationHierarchy1=2fcb99c455831013ea52b82135ba3266&timeType=5509c0b5959810ac0029943377d47364&jobFamilyGroup=0c40f6bd1d8f10ae43ffaefd46dc7e78&workerSubType=0c40f6bd1d8f10adf6dae161b1844a15',
      scrape: true,
      cooldown: 2000,
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
