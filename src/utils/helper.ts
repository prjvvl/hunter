import fs from 'fs';
import { JobData } from '../models/job';

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate a random delay within a range
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 * @returns Random delay in milliseconds
 */
export const randomDelay = (min: number = 1000, max: number = 3000): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Ensure a directory exists
 * @param dirPath Directory path
 */
export const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Generate a timestamp string for filenames
 * @returns Timestamp string (YYYY-MM-DD-HH-mm-ss)
 */
export const getTimestampString = (): string => {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '-');
};

/**
 * Clean text - remove extra whitespace, newlines, etc.
 * @param text Input text
 * @returns Cleaned text
 */
export const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .replace(/[\r\n]+/g, ' ') // Replace newlines with a space
    .trim(); // Remove leading/trailing whitespace
};

/**
 * Truncate text to a maximum length
 * @param text Input text
 * @param maxLength Maximum length
 * @param addEllipsis Whether to add ellipsis if truncated
 * @returns Truncated text
 */
export const truncateText = (
  text: string,
  maxLength: number = 300,
  addEllipsis: boolean = true
): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + (addEllipsis ? '...' : '');
};
