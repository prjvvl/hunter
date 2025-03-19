// web/server/server.ts - Express server for job listings website
import express from 'express';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define interfaces
interface JobListing {
  title: string;
  company: string;
  location: string;
  jobId: string;
  postedDate: string;
  workType: string;
  description: string;
  requirements: string;
  salary: string;
  experience: string;
  employmentType: string;
  link: string;
  source: string;
  scrapedAt: string;
  lastUpdated: string;
  uniqueId: string;
  [key: string]: string; // Allow any string keys
}

// Create Express application
const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, '../../web/public')));

// API endpoint to get job listings
app.get('/api/jobs', async (req, res) => {
  try {
    const csvFilePath =
      process.env.CSV_DATABASE_PATH || path.join(process.cwd(), 'data', 'jobs.csv');

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      return res.status(404).json({ error: 'Job database not found' });
    }

    const jobs: JobListing[] = [];

    // Read CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => jobs.push(data))
      .on('end', () => {
        // Parse query params for filtering
        const company = (req.query.company as string)?.toLowerCase();
        const search = (req.query.search as string)?.toLowerCase();
        const sortBy = (req.query.sortBy as string) || 'postedDate';
        const sortOrder = (req.query.sortOrder as string) || 'desc';

        // Filter jobs
        let filteredJobs = [...jobs];

        if (company) {
          filteredJobs = filteredJobs.filter((job) => job.company.toLowerCase().includes(company));
        }

        if (search) {
          filteredJobs = filteredJobs.filter(
            (job) =>
              job.title.toLowerCase().includes(search) ||
              job.description.toLowerCase().includes(search) ||
              job.requirements.toLowerCase().includes(search) ||
              job.location.toLowerCase().includes(search)
          );
        }

        // Sort jobs
        filteredJobs.sort((a, b) => {
          const valueA = a[sortBy] || '';
          const valueB = b[sortBy] || '';

          // Check if values could be dates
          if (sortBy === 'postedDate' || sortBy === 'scrapedAt' || sortBy === 'lastUpdated') {
            const dateA = new Date(valueA);
            const dateB = new Date(valueB);

            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              return sortOrder === 'asc'
                ? dateA.getTime() - dateB.getTime()
                : dateB.getTime() - dateA.getTime();
            }
          }

          // Regular string comparison
          return sortOrder === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        });

        // Get stats
        const stats = {
          totalJobs: jobs.length,
          filteredJobs: filteredJobs.length,
          companies: [...new Set(jobs.map((job) => job.company))].length,
          lastUpdated: jobs.reduce((latest, job) => {
            const jobDate = new Date(job.lastUpdated);
            const latestDate = new Date(latest);
            return jobDate > latestDate ? job.lastUpdated : latest;
          }, '2000-01-01'),
        };

        // Paginate results
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

        // Return results
        return res.json({
          jobs: paginatedJobs,
          stats,
          pagination: {
            total: filteredJobs.length,
            pages: Math.ceil(filteredJobs.length / limit),
            currentPage: page,
            limit,
          },
        });
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        return res.status(500).json({ error: 'Failed to read job database' });
      });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../web/public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Web server running at http://localhost:${PORT}`);
});
