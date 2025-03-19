import cron from 'node-cron';
import config from '../config';
import logger from '../utils/logger';

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Check if cron expression is valid
 * @param expression Cron expression
 * @returns True if expression is valid
 */
function isValidCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * Initialize job scheduler
 * @param scheduleFunction Function to schedule
 * @returns True if scheduler was initialized successfully
 */
export function initScheduler(scheduleFunction: () => Promise<void>): boolean {
  const cronExpression = config.scheduleCron;

  if (!isValidCronExpression(cronExpression)) {
    logger.error(`Invalid cron expression: ${cronExpression}`);
    return false;
  }

  try {
    // Stop any existing scheduled task
    stopScheduler();

    // Schedule the task
    logger.info(`Scheduling job with cron expression: ${cronExpression}`);
    scheduledTask = cron.schedule(cronExpression, async () => {
      logger.info('Running scheduled job scraping task');
      try {
        await scheduleFunction();
        logger.info('Scheduled job scraping completed successfully');
      } catch (error) {
        logger.error('Error in scheduled job scraping', { error });
      }
    });

    return true;
  } catch (error) {
    logger.error('Failed to initialize scheduler', { error });
    return false;
  }
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (scheduledTask) {
    logger.info('Stopping scheduled task');
    scheduledTask.stop();
    scheduledTask = null;
  }
}

/**
 * Get a human-readable description of the schedule
 * @returns Human-readable schedule description
 */
export function getScheduleDescription(): string {
  const cronExpression = config.scheduleCron;

  // Simple expressions
  if (cronExpression === '0 */6 * * *') {
    return 'Every 6 hours';
  } else if (cronExpression === '0 */12 * * *') {
    return 'Every 12 hours';
  } else if (cronExpression === '0 0 * * *') {
    return 'Daily at midnight';
  } else if (cronExpression === '0 0 * * 1') {
    return 'Weekly on Monday at midnight';
  } else if (cronExpression === '0 8,10,13,16,19,22 * * *') {
    return '6 times a day at 8am, 10am, 1pm, 4pm, 7pm, 10pm';
  }

  // For more complex expressions, just return the cron expression
  return `Cron schedule: ${cronExpression}`;
}
