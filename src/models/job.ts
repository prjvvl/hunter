export interface JobData {
  title: string;
  company: string;
  location: string;
  jobId: string;
  postedDate: string;
  description: string;
  requirements: string;
  experience: string;
  source: string;
  link: string;
  scrapedAt?: string;
  lastUpdated?: string;
  uniqueKey?: string;
  [key: string]: any;
}

export class Job implements JobData {
  title: string;
  company: string;
  location: string;
  jobId: string;
  postedDate: string;
  description: string;
  requirements: string;
  experience: string;
  link: string;
  source: string;
  scrapedAt: string;
  lastUpdated: string;
  uniqueKey: string;

  /**
   * Create a new Job instance
   * @param data Job data
   */
  constructor(data: Partial<JobData> = {}) {
    this.title = data.title || '';
    this.company = data.company || '';
    this.location = data.location || '';
    this.jobId = data.jobId || '';
    this.postedDate = data.postedDate || '';
    this.description = data.description || '';
    this.requirements = data.requirements || '';
    this.experience = data.experience || '';
    this.link = data.link || '';
    this.source = data.source || '';
    this.scrapedAt = data.scrapedAt || new Date().toISOString();
    this.lastUpdated = data.lastUpdated || this.scrapedAt;
    this.uniqueKey = (this.company + this.title + this.jobId + this.link).trim();
  }

  /**
   * Validate job data
   * @returns True if job data is valid
   */
  isValid(): boolean {
    // Job must have at least a title and either a job ID or link
    return !!this.title && !!(this.jobId || this.link);
  }

  /**
   * Create a CSV-friendly version of the job data
   * @returns Job data for CSV export
   */
  toCSV(): JobData {
    return {
      title: this.title,
      company: this.company,
      location: this.location,
      jobId: this.jobId,
      postedDate: this.postedDate,
      description: this.description,
      requirements: this.requirements,
      experience: this.experience,
      link: this.link,
      source: this.source,
      scrapedAt: this.scrapedAt,
      lastUpdated: this.lastUpdated,
      uniqueKey: this.uniqueKey,
    };
  }

  /**
   * Create a human-readable summary of the job
   * @returns Job summary string
   */
  toSummary(): string {
    const details = [
      this.title ? `🔍 <b>${this.title}</b>` : '',
      this.company ? `🏢 <i>${this.company}</i>` : '',
      this.location ? `📍 ${this.location}` : '',
      this.postedDate ? `📅 ${this.postedDate}` : '',
      this.experience ? `⏳ ${this.experience}` : '',
      this.link ? `🔗 <a href="${this.link}">Link</a>` : '',
    ];
    return details.filter(Boolean).join('\n');
  }

  /**
   * Create a Job instance from raw data
   * @param data Raw job data
   * @returns Job instance
   */
  static fromRawData(data: Partial<JobData>): Job {
    return new Job(data);
  }

  /**
   * Update a job with new data, preserving original scrape date
   * @param newData New job data
   * @returns Updated job instance
   */
  update(newData: Partial<JobData>): Job {
    // Preserve original scraped date
    const originalScrapedAt = this.scrapedAt;

    // Update with new data
    Object.assign(
      this,
      new Job({
        ...this,
        ...newData,
        scrapedAt: originalScrapedAt,
        lastUpdated: new Date().toISOString(),
      })
    );
    return this;
  }
}
