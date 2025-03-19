// Main JavaScript for job portal dashboard

// Global state
const state = {
  jobs: [],
  companies: [],
  currentPage: 1,
  totalPages: 1,
  searchTerm: '',
  companyFilter: '',
  sortBy: 'postedDate',
  sortOrder: 'desc',
  jobsPerPage: 20,
};

// DOM Elements
const elements = {
  jobContainer: document.getElementById('job-container'),
  jobList: document.getElementById('job-list'),
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('error-message'),
  errorText: document.getElementById('error-text'),
  searchInput: document.getElementById('search-input'),
  searchButton: document.getElementById('search-button'),
  companyFilter: document.getElementById('company-filter'),
  sortBy: document.getElementById('sort-by'),
  pagination: document.getElementById('pagination'),
  showingRange: document.getElementById('showing-range'),
  totalFiltered: document.getElementById('total-filtered'),
  statsLoading: document.getElementById('stats-loading'),
  statsContent: document.getElementById('stats-content'),
  totalJobs: document.getElementById('total-jobs'),
  totalCompanies: document.getElementById('total-companies'),
  lastUpdated: document.getElementById('last-updated'),
  jobModal: document.getElementById('job-modal'),
  jobModalTitle: document.getElementById('job-modal-title'),
  jobModalBody: document.getElementById('job-modal-body'),
  jobApplyLink: document.getElementById('job-apply-link'),
};

// Bootstrap modal instance
let jobModal;

// Initialize the application
function init() {
  // Initialize Bootstrap modal
  jobModal = new bootstrap.Modal(elements.jobModal);

  // Set up event listeners
  setupEventListeners();

  // Fetch jobs
  fetchJobs();
}

// Set up event listeners
function setupEventListeners() {
  // Search button
  elements.searchButton.addEventListener('click', () => {
    state.searchTerm = elements.searchInput.value;
    state.currentPage = 1;
    fetchJobs();
  });

  // Search input (enter key)
  elements.searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      state.searchTerm = elements.searchInput.value;
      state.currentPage = 1;
      fetchJobs();
    }
  });

  // Company filter
  elements.companyFilter.addEventListener('change', () => {
    state.companyFilter = elements.companyFilter.value;
    state.currentPage = 1;
    fetchJobs();
  });

  // Sort by
  elements.sortBy.addEventListener('change', () => {
    state.sortBy = elements.sortBy.value;
    fetchJobs();
  });
}

// Fetch jobs from API
async function fetchJobs() {
  try {
    // Show loading, hide error and job container
    elements.loading.classList.remove('d-none');
    elements.errorMessage.classList.add('d-none');
    elements.jobContainer.classList.add('d-none');

    // Build API URL with parameters
    const url = new URL('/api/jobs', window.location.origin);
    url.searchParams.append('page', state.currentPage.toString());
    url.searchParams.append('limit', state.jobsPerPage.toString());

    if (state.searchTerm) {
      url.searchParams.append('search', state.searchTerm);
    }

    if (state.companyFilter) {
      url.searchParams.append('company', state.companyFilter);
    }

    url.searchParams.append('sortBy', state.sortBy);
    url.searchParams.append('sortOrder', state.sortOrder);

    // Fetch jobs from API
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Update state
    state.jobs = data.jobs;
    state.totalPages = data.pagination.pages;

    // Update companies list if not already populated
    if (state.companies.length === 0) {
      updateCompanyList(data.stats);
    }

    // Update stats
    updateStats(data.stats);

    // Render jobs
    renderJobs();

    // Render pagination
    renderPagination();

    // Show job container, hide loading
    elements.loading.classList.add('d-none');
    elements.jobContainer.classList.remove('d-none');
  } catch (error) {
    console.error('Error fetching jobs:', error);

    // Show error message
    elements.loading.classList.add('d-none');
    elements.errorMessage.classList.remove('d-none');
    elements.errorText.textContent = `Failed to load job data: ${error.message}`;
  }
}

// Update company list in filter dropdown
function updateCompanyList(stats) {
  // Get unique companies
  const companies = [...new Set(state.jobs.map((job) => job.company))].sort();
  state.companies = companies;

  // Clear existing options (except first one)
  while (elements.companyFilter.options.length > 1) {
    elements.companyFilter.remove(1);
  }

  // Add companies to dropdown
  companies.forEach((company) => {
    const option = document.createElement('option');
    option.value = company;
    option.textContent = company;
    elements.companyFilter.appendChild(option);
  });
}

// Update stats display
function updateStats(stats) {
  // Format date
  const lastUpdated = new Date(stats.lastUpdated);
  const formattedDate =
    lastUpdated.toLocaleDateString() +
    ' ' +
    lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Update stats
  elements.totalJobs.textContent = stats.totalJobs;
  elements.totalCompanies.textContent = stats.companies;
  elements.lastUpdated.textContent = formattedDate;
  elements.totalFiltered.textContent = stats.filteredJobs;

  // Calculate range
  const start = (state.currentPage - 1) * state.jobsPerPage + 1;
  const end = Math.min(state.currentPage * state.jobsPerPage, stats.filteredJobs);
  elements.showingRange.textContent = `${start}-${end}`;

  // Show stats content, hide loading
  elements.statsLoading.classList.add('d-none');
  elements.statsContent.classList.remove('d-none');
}

// Render jobs
function renderJobs() {
  // Clear existing job cards
  elements.jobList.innerHTML = '';

  // If no jobs found
  if (state.jobs.length === 0) {
    const noJobsElement = document.createElement('div');
    noJobsElement.className = 'col-12 text-center py-5';
    noJobsElement.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i> No jobs found matching your criteria.
        </div>
      `;
    elements.jobList.appendChild(noJobsElement);
    return;
  }

  // Create job cards
  state.jobs.forEach((job) => {
    const jobCard = createJobCard(job);
    elements.jobList.appendChild(jobCard);
  });
}

// Create job card element
function createJobCard(job) {
  const col = document.createElement('div');
  col.className = 'col-md-6 col-lg-4 mb-4';

  // Determine company badge color
  const companyClass = getCompanyBadgeClass(job.company);

  // Format date
  let postedDate = 'Unknown date';
  if (job.postedDate) {
    try {
      const date = new Date(job.postedDate);
      postedDate = isNaN(date.getTime()) ? job.postedDate : date.toLocaleDateString();
    } catch (e) {
      postedDate = job.postedDate;
    }
  }

  col.innerHTML = `
      <div class="card job-card h-100">
        <div class="card-body">
          <h5 class="card-title">${escapeHtml(job.title)}</h5>
          <span class="badge ${companyClass} mb-2 company-badge">${escapeHtml(job.company)}</span>
          <p class="location mb-2">
            <i class="bi bi-geo-alt"></i> ${escapeHtml(job.location || 'Location not specified')}
          </p>
          <p class="card-text">${escapeHtml(job.description || 'No description available')}</p>
        </div>
        <div class="card-footer bg-white d-flex justify-content-between align-items-center">
          <small class="date-posted">
            <i class="bi bi-calendar"></i> ${postedDate}
          </small>
          <button class="btn btn-sm btn-outline-primary view-details" data-job-id="${job.uniqueId}">
            View Details
          </button>
        </div>
      </div>
    `;

  // Add event listener to view details button
  const detailsButton = col.querySelector('.view-details');
  detailsButton.addEventListener('click', () => {
    showJobDetails(job);
  });

  return col;
}

// Show job details in modal
function showJobDetails(job) {
  // Set modal title
  elements.jobModalTitle.textContent = job.title;

  // Format dates
  const postedDate = formatDate(job.postedDate);
  const scrapedDate = formatDate(job.scrapedAt);
  const updatedDate = formatDate(job.lastUpdated);

  // Build modal body HTML
  const modalBody = `
      <div class="job-detail-header">
        <div class="job-detail-company mb-1">
          <span class="badge ${getCompanyBadgeClass(job.company)}">${escapeHtml(job.company)}</span>
        </div>
        <div class="job-detail-location">
          <i class="bi bi-geo-alt"></i> ${escapeHtml(job.location || 'Location not specified')}
        </div>
      </div>
      
      <div class="job-detail-section">
        <h6>Overview</h6>
        <p>${escapeHtml(job.description || 'No description available')}</p>
      </div>
      
      ${
        job.requirements
          ? `
      <div class="job-detail-section">
        <h6>Requirements</h6>
        <p>${escapeHtml(job.requirements)}</p>
      </div>
      `
          : ''
      }
      
      <div class="job-detail-section">
        <h6>Additional Details</h6>
        <div class="row">
          <div class="col-md-6">
            <ul class="list-unstyled">
              <li><strong>Job ID:</strong> ${escapeHtml(job.jobId)}</li>
              <li><strong>Posted Date:</strong> ${postedDate}</li>
              ${
                job.workType
                  ? `<li><strong>Work Type:</strong> ${escapeHtml(job.workType)}</li>`
                  : ''
              }
            </ul>
          </div>
          <div class="col-md-6">
            <ul class="list-unstyled">
              ${
                job.employmentType
                  ? `<li><strong>Employment Type:</strong> ${escapeHtml(job.employmentType)}</li>`
                  : ''
              }
              ${
                job.experience
                  ? `<li><strong>Experience:</strong> ${escapeHtml(job.experience)}</li>`
                  : ''
              }
              ${job.salary ? `<li><strong>Salary:</strong> ${escapeHtml(job.salary)}</li>` : ''}
            </ul>
          </div>
        </div>
      </div>
      
      <div class="job-detail-section small text-muted">
        <p class="mb-1">Source: ${escapeHtml(job.source)}</p>
        <p class="mb-1">First scraped: ${scrapedDate}</p>
        <p class="mb-0">Last updated: ${updatedDate}</p>
      </div>
    `;

  // Set modal body
  elements.jobModalBody.innerHTML = modalBody;

  // Set apply link
  if (job.link) {
    elements.jobApplyLink.href = job.link;
    elements.jobApplyLink.classList.remove('d-none');
  } else {
    elements.jobApplyLink.href = '#';
    elements.jobApplyLink.classList.add('d-none');
  }

  // Show modal
  jobModal.show();
}

// Render pagination
function renderPagination() {
  // Clear existing pagination
  elements.pagination.innerHTML = '';

  // Don't show pagination if only one page
  if (state.totalPages <= 1) {
    return;
  }

  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${state.currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `
      <button class="page-link" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </button>
    `;

  if (state.currentPage > 1) {
    prevLi.querySelector('button').addEventListener('click', () => {
      goToPage(state.currentPage - 1);
    });
  }

  elements.pagination.appendChild(prevLi);

  // Page buttons
  const maxVisiblePages = 5;
  let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);

  // Adjust if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // First page button if not visible
  if (startPage > 1) {
    const firstLi = document.createElement('li');
    firstLi.className = 'page-item';
    firstLi.innerHTML = '<button class="page-link">1</button>';
    firstLi.querySelector('button').addEventListener('click', () => {
      goToPage(1);
    });
    elements.pagination.appendChild(firstLi);

    // Ellipsis if needed
    if (startPage > 2) {
      const ellipsisLi = document.createElement('li');
      ellipsisLi.className = 'page-item disabled';
      ellipsisLi.innerHTML = '<span class="page-link">...</span>';
      elements.pagination.appendChild(ellipsisLi);
    }
  }

  // Visible page buttons
  for (let i = startPage; i <= endPage; i++) {
    const pageLi = document.createElement('li');
    pageLi.className = `page-item ${i === state.currentPage ? 'active' : ''}`;
    pageLi.innerHTML = `<button class="page-link">${i}</button>`;

    if (i !== state.currentPage) {
      pageLi.querySelector('button').addEventListener('click', () => {
        goToPage(i);
      });
    }

    elements.pagination.appendChild(pageLi);
  }

  // Last page button if not visible
  if (endPage < state.totalPages) {
    // Ellipsis if needed
    if (endPage < state.totalPages - 1) {
      const ellipsisLi = document.createElement('li');
      ellipsisLi.className = 'page-item disabled';
      ellipsisLi.innerHTML = '<span class="page-link">...</span>';
      elements.pagination.appendChild(ellipsisLi);
    }

    const lastLi = document.createElement('li');
    lastLi.className = 'page-item';
    lastLi.innerHTML = `<button class="page-link">${state.totalPages}</button>`;
    lastLi.querySelector('button').addEventListener('click', () => {
      goToPage(state.totalPages);
    });
    elements.pagination.appendChild(lastLi);
  }

  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${state.currentPage === state.totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `
      <button class="page-link" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </button>
    `;

  if (state.currentPage < state.totalPages) {
    nextLi.querySelector('button').addEventListener('click', () => {
      goToPage(state.currentPage + 1);
    });
  }

  elements.pagination.appendChild(nextLi);
}

// Go to specific page
function goToPage(page) {
  state.currentPage = page;
  fetchJobs();

  // Scroll to top of job container
  elements.jobContainer.scrollIntoView({ behavior: 'smooth' });
}

// Helper function to determine company badge class
function getCompanyBadgeClass(company) {
  if (!company) return 'company-default';

  const companyLower = company.toLowerCase();

  if (companyLower.includes('amazon')) {
    return 'company-amazon';
  } else if (companyLower.includes('microsoft')) {
    return 'company-microsoft';
  } else if (companyLower.includes('google')) {
    return 'company-google';
  } else if (companyLower.includes('apple')) {
    return 'company-apple';
  } else if (companyLower.includes('meta') || companyLower.includes('facebook')) {
    return 'company-meta';
  } else {
    return 'company-default';
  }
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }

    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  } catch (e) {
    return dateStr;
  }
}

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
