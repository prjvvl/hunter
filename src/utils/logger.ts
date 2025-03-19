import fs from 'fs';
import config from '../config';
import winston from 'winston';
import path from 'path';

const logsDir = config.logDir;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    // File transport - general log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 4 * 1024 * 1024, // 4MB
      maxFiles: 5,
    }),
    // File transport - error log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 4 * 1024 * 1024, // 4MB
      maxFiles: 5,
    }),
  ],
});

export default logger;
