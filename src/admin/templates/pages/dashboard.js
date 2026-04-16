// src/admin/templates/pages/dashboard.js
// Dashboard page template

import { mainLayout } from '../layouts/main.js';

/**
 * Dashboard Page Template
 * Displays quick stats, traffic chart, recent activity, and top posts
 *
 * @param {Object} options
 * @param {Object} options.user - Current user data
 * @param {Object} options.stats - Dashboard statistics
 * @param {number} options.stats.totalPosts - Total post count
 * @param {number} options.stats.totalViews - Total page views
 * @param {number} options.stats.totalComments - Total comments
 * @param {number} options.stats.totalSubscribers - Total subscribers
 * @param {Array} options.activity - Recent activity items
 * @param {Array} options.recentPosts - Recent posts list
 * @param {Array} options.topPosts - Top performing posts
 * @returns {string} Complete HTML page
 */
export function dashboardPage({ user, stats = {}, activity = [], recentPosts = [], topPosts = [], range = '30d', trafficChart = '' }) {
  const {
    totalPosts = 0,
    totalViews = '0',
    totalComments = 0,
    totalSubscribers = 0,
    postsGrowth = 0,
    viewsGrowth = 0,
    commentsGrowth = 0,
    subscribersGrowth = 0
  } = stats;

  const content = `
    <div class="dashboard">
      <div class="content">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header__left">
        <h1 class="page-header__title">Dashboard</h1>
        <p class="page-header__subtitle">Welcome back, ${user?.firstName || 'User'}! Here's what's happening with your blog today.</p>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <div class="quick-stat">
        <div class="quick-stat__icon quick-stat__icon--posts">
          <i data-lucide="file-text"></i>
        </div>
        <div class="quick-stat__content">
          <span class="quick-stat__label">Total Posts</span>
          <span class="quick-stat__value">${totalPosts}</span>
          <span class="quick-stat__change ${stats.postsGrowth >= 0 ? 'quick-stat__change--up' : 'quick-stat__change--down'}">
            <i data-lucide="${stats.postsGrowth >= 0 ? 'trending-up' : 'trending-down'}"></i>
            ${Math.abs(stats.postsGrowth)}% from last month
          </span>
        </div>
      </div>

      <div class="quick-stat">
        <div class="quick-stat__icon quick-stat__icon--views">
          <i data-lucide="eye"></i>
        </div>
        <div class="quick-stat__content">
          <span class="quick-stat__label">Page Views</span>
          <span class="quick-stat__value">${totalViews}</span>
          <span class="quick-stat__change ${stats.viewsGrowth >= 0 ? 'quick-stat__change--up' : 'quick-stat__change--down'}">
            <i data-lucide="${stats.viewsGrowth >= 0 ? 'trending-up' : 'trending-down'}"></i>
            ${Math.abs(stats.viewsGrowth)}% from last month
          </span>
        </div>
      </div>

      <div class="quick-stat">
        <div class="quick-stat__icon quick-stat__icon--comments">
          <i data-lucide="message-square"></i>
        </div>
        <div class="quick-stat__content">
          <span class="quick-stat__label">Comments</span>
          <span class="quick-stat__value">${totalComments}</span>
          <span class="quick-stat__change ${stats.commentsGrowth >= 0 ? 'quick-stat__change--up' : 'quick-stat__change--down'}">
            <i data-lucide="${stats.commentsGrowth >= 0 ? 'trending-up' : 'trending-down'}"></i>
            ${Math.abs(stats.commentsGrowth)}% from last month
          </span>
        </div>
      </div>

      <div class="quick-stat">
        <div class="quick-stat__icon quick-stat__icon--users">
          <i data-lucide="users"></i>
        </div>
        <div class="quick-stat__content">
          <span class="quick-stat__label">Subscribers</span>
          <span class="quick-stat__value">${totalSubscribers}</span>
          <span class="quick-stat__change ${stats.subscribersGrowth >= 0 ? 'quick-stat__change--up' : 'quick-stat__change--down'}">
            <i data-lucide="${stats.subscribersGrowth >= 0 ? 'trending-up' : 'trending-down'}"></i>
            ${Math.abs(stats.subscribersGrowth)}% from last month
          </span>
        </div>
      </div>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="dashboard-grid dashboard-grid--main">
      <!-- Traffic Chart -->
      <div class="widget widget--traffic-overview">
        <div class="widget__header widget__header--traffic">
          <div>
            <h5 class="widget__title">Traffic Overview</h5>
            <h6 class="widget__subtitle">Page views and unique visitors</h6>
          </div>
          <!-- Chart Range Tabs -->
          <nav class="chart-range" aria-label="Chart range" role="tablist" id="traffic-tabs">
            <button
              type="button"
              class="chart-range__item ${range === '7d' ? 'active' : ''}"
              id="chart-range-7d"
              aria-selected="${range === '7d' ? 'true' : 'false'}"
              data-range="7d"
              role="tab"
              hx-get="/admin/traffic?range=7d"
              hx-target="#chart-container-wrapper"
              hx-swap="innerHTML"
              onclick="updateActiveTab('7d')"
            >
              7 Days
            </button>
            <button
              type="button"
              class="chart-range__item ${range === '30d' || !range ? 'active' : ''}"
              id="chart-range-30d"
              aria-selected="${range === '30d' || !range ? 'true' : 'false'}"
              data-range="30d"
              role="tab"
              hx-get="/admin/traffic?range=30d"
              hx-target="#chart-container-wrapper"
              hx-swap="innerHTML"
              onclick="updateActiveTab('30d')"
            >
              30 Days
            </button>
            <button
              type="button"
              class="chart-range__item ${range === '90d' ? 'active' : ''}"
              id="chart-range-90d"
              aria-selected="${range === '90d' ? 'true' : 'false'}"
              data-range="90d"
              role="tab"
              hx-get="/admin/traffic?range=90d"
              hx-target="#chart-container-wrapper"
              hx-swap="innerHTML"
              onclick="updateActiveTab('90d')"
            >
              90 Days
            </button>
            <button
              type="button"
              class="chart-range__item ${range === '1y' ? 'active' : ''}"
              id="chart-range-1y"
              aria-selected="${range === '1y' ? 'true' : 'false'}"
              data-range="1y"
              role="tab"
              hx-get="/admin/traffic?range=1y"
              hx-target="#chart-container-wrapper"
              hx-swap="innerHTML"
              onclick="updateActiveTab('1y')"
            >
              1 Year
            </button>
          </nav>
        </div>
        <hr class="divider" />
        <div class="widget__body">
          <!-- Chart Container Wrapper - HTMX target -->
          <div id="chart-container-wrapper">
            ${trafficChart || `
            <div id="chart-panel-${range || '30d'}" role="tabpanel" aria-labelledby="chart-range-${range || '30d'}">
              <div class="chart-container__chart">
                <div class="text-center text-gray-500 py-8">
                  <i data-lucide="bar-chart-2" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                  <p>Loading chart...</p>
                </div>
              </div>
            </div>
            `}
          </div>
        </div>
      </div>

      <script>
        function updateActiveTab(selectedRange) {
          // Remove active class from all tabs
          document.querySelectorAll('.chart-range__item').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
          });
          
          // Add active class to selected tab
          const activeTab = document.querySelector('#chart-range-' + selectedRange);
          if (activeTab) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
          }
        }
      </script>

      <!-- Recent Activity -->
      <div class="widget widget--recent-activity">
        <div class="widget__header">
          <h5 class="widget__title">Recent Activity</h5>
        </div>
        <hr class="divider" />
        <div class="widget__body">
          <div class="activity-timeline" id="activity-timeline">
            ${getActivityItems(activity)}
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary Grid -->
    <div class="dashboard-grid dashboard-grid--equal">
      <!-- Recent Posts -->
      <div class="widget widget--flush">
        <div class="widget__header">
          <h5 class="widget__title">Recent Posts</h5>
          <h5><a href="/admin/posts/new" class="widget__link">Add New</a></h5>
        </div>
        <hr class="divider" />
        <div class="widget__body">
          <div class="recent-posts">
            ${getRecentPosts(recentPosts)}
          </div>
        </div>
      </div>

      <!-- Top Posts -->
      <div class="widget widget--flush">
        <div class="widget__header">
          <h5 class="widget__title">Top Posts</h5>
        </div>
        <hr class="divider" />
        <div class="widget__body">
          <div class="top-list">
            ${getTopPosts(topPosts)}
          </div>
        </div>
      </div>
    </div>
  </div>
  `;

  return mainLayout({
    title: 'Dashboard',
    description: 'BlogCMS Dashboard - Overview',
    content,
    user,
    activeRoute: '/admin'
  });
}

// Helper function for activity items
function getActivityItems(items) {
  if (!items || items.length === 0) {
    return `
      <div class="empty">
        <i data-lucide="activity"></i>
        <p>No recent activity</p>
      </div>
    `;
  }

  return items.map(item => `
    <div class="activity-timeline__item">
      <div class="activity-timeline__dot activity-timeline__dot--${item.type}">
        <i data-lucide="${item.icon}"></i>
      </div>
      <div class="activity-timeline__content">
        <p class="activity-timeline__text">${item.text}</p>
        <span class="activity-timeline__time">${item.time}</span>
      </div>
    </div>
  `).join('');
}

// Helper function for recent posts
function getRecentPosts(posts) {
  if (!posts || posts.length === 0) {
    return `
      <div class="empty">
        <i data-lucide="file-text"></i>
        <p>No posts yet</p>
      </div>
    `;
  }

  return posts.map(post => `
    <div class="recent-posts__item">
    
      <div class="recent-posts__content">
        <h4 class="recent-posts__title">${post.title}</h4>
        <div class="recent-posts__meta">
          <span>${post.author || 'Unknown'}</span>
          <span>•</span>
          <span>${post.date || 'No date'}</span>
        </div>
      </div>
      <span class="badge badge--${post.status === 'PUBLISHED' ? 'success' : 'warning'}">${post.status ? post.status.charAt(0).toUpperCase() + post.status.slice(1).toLowerCase() : 'Draft'}</span>
    </div>
  `).join('');
}

// Helper function for top posts
function getTopPosts(posts) {
  if (!posts || posts.length === 0) {
    return `
      <div class="empty">
        <i data-lucide="trending-up"></i>
        <p>No posts</p>
      </div>
    `;
  }

  return posts.map((post, index) => `
    <div class="top-list__item">
      <div class="top-list__left">
         <span class="top-list__rank top-list__rank--neutral">${index + 1}</span>
        <div class="top-list__info">
          <h6 class="top-list__title">${post.title}</h6>
          <span class="top-list__url">${post.url || '/blog/' + post.slug}</span>
        </div>
      </div>
      <div class="top-list__right">
        <span class="top-list__value">${post.views || 0} Views</span>
        <span class="top-list__change top-list__change--${post.trend === 'up' ? 'up' : 'down'}">
          <i data-lucide="${post.trend === 'up' ? 'trending-up' : 'trending-down'}"></i>
          ${post.change || 0}%
        </span>
      </div>
    </div>
  `).join('');
}
