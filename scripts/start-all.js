// Script to start both the scraper and web interface

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure the logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log streams
const scraperLogStream = fs.createWriteStream(path.join(logsDir, 'scraper.log'), { flags: 'a' });
const webLogStream = fs.createWriteStream(path.join(logsDir, 'web.log'), { flags: 'a' });

// Start the scraper
console.log('Starting job scraper...');
const scraper = spawn('node', ['dist/index.js'], {
  cwd: path.join(__dirname, '..'),
});

scraper.stdout.pipe(process.stdout);
scraper.stderr.pipe(process.stderr);
scraper.stdout.pipe(scraperLogStream);
scraper.stderr.pipe(scraperLogStream);

// Start the web interface
console.log('Starting web interface...');
const web = spawn('node', ['dist/web/server/server.js'], {
  cwd: path.join(__dirname, '..'),
});

web.stdout.pipe(process.stdout);
web.stderr.pipe(process.stderr);
web.stdout.pipe(webLogStream);
web.stderr.pipe(webLogStream);

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down...');
  scraper.kill();
  web.kill();
  process.exit(0);
});

// Handle child process exit
scraper.on('exit', (code) => {
  console.log(`Scraper process exited with code ${code}`);
  // Don't exit the main process as the web interface might still be running
});

web.on('exit', (code) => {
  console.log(`Web interface process exited with code ${code}`);
  // Don't exit the main process as the scraper might still be running
});

console.log('Both services started. Press Ctrl+C to stop.');
