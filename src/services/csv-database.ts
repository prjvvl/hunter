// src/services/csv-database.ts - CSV database management
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import csvParser from 'csv-parser';
import { Job, JobData } from '../models/job';
import config from '../config';
import logger from '../utils/logger';
import { ensureDirectoryExists } from '../utils/helper';

// Ensure output directory exists
ensureDirectoryExists(path.dirname(config.outputDir));

const csvDatabasePath = path.join(config.outputDir, 'jobs.csv');
export const newJobsPath = path.join(config.outputDir, 'newly_added_jobs.csv');

// Define the headers for the CSV file
const headers = [
  { id: 'title', title: 'Title' },
  { id: 'company', title: 'Company' },
  { id: 'location', title: 'Location' },
  { id: 'jobId', title: 'Job ID' },
  { id: 'postedDate', title: 'Posted Date' },
  { id: 'workType', title: 'Work Type' },
  { id: 'description', title: 'Description' },
  { id: 'requirements', title: 'Requirements' },
  { id: 'salary', title: 'Salary' },
  { id: 'experience', title: 'Experience' },
  { id: 'employmentType', title: 'Employment Type' },
  { id: 'link', title: 'Link' },
  { id: 'source', title: 'Source' },
  { id: 'scrapedAt', title: 'Scraped At' },
  { id: 'lastUpdated', title: 'Last Updated' },
];

/**
 * Load jobs from CSV database
 * @returns Promise with array of jobs
 */
export async function loadJobsFromDatabase(): Promise<Job[]> {
  // Check if database file exists
  if (!fs.existsSync(csvDatabasePath)) {
    logger.info('CSV database file does not exist yet');
    return [];
  }

  return new Promise((resolve, reject) => {
    const jobs: Job[] = [];

    fs.createReadStream(csvDatabasePath)
      .pipe(csvParser())
      .on('data', (row: Record<string, string>) => {
        // Convert CSV row to job data
        const jobData: Partial<JobData> = {};

        // Map each header to the corresponding field
        headers.forEach((header) => {
          const key = header.id;
          if (row[header.title] !== undefined) {
            jobData[key] = row[header.title];
          }
        });

        // Create job object
        const job = new Job(jobData);
        jobs.push(job);
      })
      .on('end', () => {
        logger.info(`Loaded ${jobs.length} jobs from database`);
        resolve(jobs);
      })
      .on('error', (error) => {
        logger.error('Error loading jobs from database', { error });
        reject(error);
      });
  });
}

/**
 * Save jobs to CSV database file
 * @param jobs Array of jobs to save
 * @returns Promise that resolves when jobs are saved
 */
export async function saveJobsToDatabase(
  jobs: Job[],
  path: string = csvDatabasePath
): Promise<void> {
  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: path,
    header: headers,
  });

  // Convert jobs to CSV format
  const jobsForCsv = jobs.map((job) => job.toCSV());

  try {
    await csvWriter.writeRecords(jobsForCsv);
    logger.info(`Saved ${jobs.length} jobs to database`);
  } catch (error) {
    logger.error('Error saving jobs to database', { error });
    throw error;
  }
}

/**
 * Export jobs to a new CSV file
 * @param jobs Array of jobs to export
 * @param filePath Path to save the CSV file
 * @returns Promise that resolves when jobs are exported
 */
export async function exportJobsToCSV(jobs: Job[], filePath: string): Promise<void> {
  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers,
  });

  // Convert jobs to CSV format
  const jobsForCsv = jobs.map((job) => job.toCSV());

  try {
    await csvWriter.writeRecords(jobsForCsv);
    logger.info(`Exported ${jobs.length} jobs to ${filePath}`);
  } catch (error) {
    logger.error('Error exporting jobs to CSV', { error });
    throw error;
  }
}

/**
 * Update database with new jobs
 * @param newJobs Array of new jobs to add or update
 * @returns Promise with updated jobs array
 */
export async function updateJobsDatabase(newJobs: Job[]): Promise<Job[]> {
  // Load existing jobs
  const existingJobs = await loadJobsFromDatabase();

  // Create a map of existing jobs by uniqueId
  const jobsMap = new Map<string, Job>();
  existingJobs.forEach((job) => {
    jobsMap.set(job.uniqueKey, job);
  });

  // Update or add new jobs
  let updatedCount = 0;
  let addedCount = 0;

  newJobs.forEach((newJob) => {
    if (jobsMap.has(newJob.uniqueKey)) {
      // Update existing job
      const existingJob = jobsMap.get(newJob.uniqueKey)!;
      existingJob.update(newJob);
      updatedCount++;
    } else {
      // Add new job
      jobsMap.set(newJob.uniqueKey, newJob);
      addedCount++;
    }
  });

  // Convert map back to array
  const updatedJobs = Array.from(jobsMap.values());

  // Save updated jobs to database
  await saveJobsToDatabase(updatedJobs);

  logger.info(`Database updated: ${addedCount} jobs added, ${updatedCount} jobs updated`);

  return updatedJobs;
}

export async function fetchNewJobOpenings(scrapedJobs: Job[]): Promise<Job[]> {
  // Load existing jobs
  const existingJobs = await loadJobsFromDatabase();

  // Create a map of existing jobs by uniqueId
  const jobsMap = new Map<string, Job>();
  existingJobs.forEach((job) => {
    jobsMap.set(job.uniqueKey, job);
  });

  // Update or add new jobs
  let updatedCount = 0;
  let addedCount = 0;

  const newJobs: Job[] = [];

  scrapedJobs.forEach((scrapedJob) => {
    if (jobsMap.has(scrapedJob.uniqueKey)) {
      // Update existing job
      const existingJob = jobsMap.get(scrapedJob.uniqueKey)!;
      existingJob.update(scrapedJob);
      updatedCount++;
    } else {
      // Add new job
      jobsMap.set(scrapedJob.uniqueKey, scrapedJob);
      addedCount++;
      newJobs.push(scrapedJob);
    }
  });

  // Convert map back to array
  const updatedJobs = Array.from(jobsMap.values());

  updatedJobs.sort((a, b) => {
    return new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime();
  });

  // Save updated jobs to database
  await saveJobsToDatabase(updatedJobs);

  // Export newly added jobs to a separate CSV file
  await exportJobsToCSV(newJobs, newJobsPath);

  logger.info(`Database updated: ${addedCount} jobs added, ${updatedCount} jobs updated`);

  // Return only the new jobs
  return newJobs;
}
