// src/admin/controllers/dashboard.controller.js
// Dashboard controller - handles dashboard HTTP requests

import { postsService } from '../../services/posts.service.js';
import { activityService } from '../../services/activity.service.js';
import { analyticsService } from '../../services/analytics.service.js';
import { subscribersService } from '../../services/subscribers.service.js';
import { commentsService } from '../../services/comments.service.js';

/**
 * Format date for dashboard display
 * Pattern: DD/MM/YYYY h:mm AM/PM (12-hour clock)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string
 */
function formatDashboardDate(dateString) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

/**
 * Dashboard Controller
 * Handles dashboard-related HTTP requests
 * Following Controller pattern - only handles HTTP layer
 */
class DashboardController {
  /**
   * GET /admin
   * Serve dashboard page
   */
  async showDashboard(request, reply) {
    try {
      const user = request.user;

      // Get real dashboard statistics from database
      const totalPosts = await postsService.getPostsCount();
      const publishedPosts = await postsService.getPostsCount({ status: 'PUBLISHED' });
      const draftPosts = await postsService.getPostsCount({ status: 'DRAFT' });
      const totalViews = await postsService.getTotalViews();
      const totalComments = await commentsService.getTotalComments();

      // Get subscriber count
      const totalSubscribers = await subscribersService.getSubscriberCount();

      // Get growth data for all stats (30 days vs previous 30 days)
      const [postsGrowth, viewsGrowth, commentsGrowth, subscribersGrowth] = await Promise.all([
        postsService.getPostsGrowth(30),
        analyticsService.getTrafficSummary({ days: 30 }),
        commentsService.getCommentsGrowth(30),
        subscribersService.getSubscriberGrowth(30),
      ]);

      const stats = {
        totalPosts,
        totalViews: totalViews.toLocaleString(),
        totalComments,
        totalSubscribers,
        // Growth percentages
        postsGrowth: postsGrowth.trend,
        viewsGrowth: viewsGrowth.trend,
        commentsGrowth: commentsGrowth.trend,
        subscribersGrowth: subscribersGrowth.trend,
      };

      // Get recent posts from database (last 5)
      const recentPostsData = await postsService.getRecentPosts(5);
      const recentPosts = recentPostsData.map((post) => ({
        title: post.title,
        author: post.author ? `${post.author.firstName} ${post.author.lastName}` : 'Unknown',
        date: formatDashboardDate(post.publishedAt || post.createdAt),
        status: post.status,
        thumbnail: post.featuredImageUrl || 'https://picsum.photos/seed/post' + post.id + '/200/150',
      }));

      // Get top posts by view count with trend data
      const topPostsData = await postsService.getTopPosts(5);
      const topPosts = await Promise.all(
        topPostsData.map(async (post) => {
          // Get post's recent views (last 7 days vs previous 7 days)
          const postTrend = await analyticsService.getPostTrend(post.id, 7);

          return {
            title: post.title,
            url: `/blog/${post.slug}`,
            views: post.viewCount,
            trend: postTrend.trend,
            change: Math.abs(Math.round(postTrend.change)),
          };
        })
      );

      // Get recent activity from database
      const activityData = await activityService.getRecent({ limit: 5, days: 7 });
      const activity = activityData.map((item) => formatActivityItem(item));

      // Get initial traffic data for chart
      const { range = '30d' } = request.query;
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = daysMap[range] || 30;
      const trafficData = await analyticsService.getTrafficData({ days });

      // Import dashboard page template
      const { dashboardPage } = await import('../templates/pages/dashboard.js');

      // Render dashboard page with initial chart data
      return reply.type('text/html').send(
        dashboardPage({
          user,
          stats,
          activity,
          recentPosts,
          topPosts,
          range,
          trafficChart: chartFragment({ range, data: trafficData }),
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(
        errorFragment({
          message: 'Failed to load dashboard. Please try again.',
        }),
      );
    }
  }

  /**
   * GET /admin/stats
   * Get dashboard statistics (HTMX fragment)
   */
  async getStats(request, reply) {
    try {
      // Get real stats from database
      const totalPosts = await postsService.getPostsCount();
      const totalViews = await postsService.getTotalViews();
      const totalSubscribers = await subscribersService.getSubscriberCount();

      const stats = {
        totalPosts,
        totalViews: totalViews.toLocaleString(),
        totalComments: 0, // TODO: Implement comments service
        totalSubscribers,
      };

      return reply.type('text/html').send(statsFragment(stats));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(
        errorFragment({
          message: 'Failed to load statistics.',
        }),
      );
    }
  }

  /**
   * GET /admin/activity
   * Get recent activity feed (HTMX fragment)
   */
  async getActivity(request, reply) {
    try {
      // Get real activity data from database
      const activityData = await activityService.getRecent({ limit: 10, days: 7 });
      const activity = activityData.map((item) => formatActivityItem(item));

      return reply.type('text/html').send(activityFragment(activity));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(
        errorFragment({
          message: 'Failed to load activity.',
        }),
      );
    }
  }

  /**
   * GET /admin/top-posts
   * Get top performing posts (HTMX fragment)
   */
  async getTopPosts(request, reply) {
    try {
      // Get real top posts from database
      const topPostsData = await postsService.getTopPosts(5);
      const topPosts = topPostsData.map((post, index) => {
        return {
          title: post.title,
          url: `/blog/${post.slug}`,
          views: post.viewCount,
          trend: 'up', // TODO: Calculate trend from analytics
          change: 0,
        };
      });

      return reply.type('text/html').send(topPostsFragment(topPosts));
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(
        errorFragment({
          message: 'Failed to load top posts.',
        }),
      );
    }
  }

  /**
   * GET /admin/traffic
   * Get traffic chart data (HTMX fragment)
   */
  async getTraffic(request, reply) {
    try {
      const { range = '30d' } = request.query;

      // Parse range to get number of days
      const daysMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
      };
      const days = daysMap[range] || 30;

      // Get real traffic data
      const trafficData = await analyticsService.getTrafficData({ days });

      // Return chart container with data
      // Add cache-busting headers to prevent stale data
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      
      return reply.type('text/html').send(
        chartFragment({
          range,
          data: trafficData,
        }),
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.type('text/html').send(
        errorFragment({
          message: 'Failed to load traffic data.',
        }),
      );
    }
  }
}

// Helper function to format activity items for dashboard display
function formatActivityItem(item) {
  const userName = item.user ? `${item.user.firstName} ${item.user.lastName}` : 'System';

  // Map activity types to icons and descriptions
  const typeConfig = {
    POST_CREATED: { icon: 'file-plus', type: 'post' },
    POST_UPDATED: { icon: 'edit', type: 'post' },
    POST_PUBLISHED: { icon: 'check-circle', type: 'post' },
    POST_DELETED: { icon: 'trash-2', type: 'post' },
    LOGIN: { icon: 'log-in', type: 'user' },
    LOGOUT: { icon: 'log-out', type: 'user' },
    COMMENT_CREATED: { icon: 'message-square', type: 'comment' },
    SUBSCRIBER_CREATED: { icon: 'user-plus', type: 'subscriber' },
  };

  const config = typeConfig[item.type] || { icon: 'activity', type: 'post' };

  return {
    type: config.type,
    icon: config.icon,
    text: item.description.replace(userName, `<strong>${userName}</strong>`),
    time: formatTimeAgo(item.createdAt),
  };
}

// Helper function to format relative time
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Helper function for error fragment
function errorFragment({ message }) {
  return `
    <div class="flex items-center gap-3 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-800" role="alert">
      <i data-lucide="alert-circle" class="w-5 h-5 shrink-0"></i>
      <span class="text-sm font-medium">${message}</span>
    </div>
  `;
}

// Helper function for chart fragment - Preline ApexCharts
function chartFragment({ range, data }) {
  if (!data || data.length === 0) {
    return `
      <div id="chart-panel-${range}" role="tabpanel" aria-labelledby="chart-range-${range}">
        <div class="chart-container__chart">
          <div class="text-center text-gray-500 py-8">
            <i data-lucide="bar-chart-2" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
            <p>No traffic data available</p>
            <p class="text-sm">Data will appear once views are recorded</p>
          </div>
        </div>
      </div>
    `;
  }

  // Aggregate data based on date range
  let aggregatedData = [];
  let categories = [];
  let dateRanges = []; // Store date ranges for tooltips

  if (data.length <= 7) {
    // 7 days: Show daily data with day names
    aggregatedData = data.map(day => ({
      views: day.views,
      visitors: day.uniqueVisitors,
      label: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      dateRange: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  } else if (data.length <= 30) {
    // 30 days: Aggregate into 4 weeks
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const daysPerWeek = Math.ceil(data.length / 4);
    
    for (let i = 0; i < 4; i++) {
      const startIdx = i * daysPerWeek;
      const endIdx = Math.min((i + 1) * daysPerWeek, data.length);
      const weekData = data.slice(startIdx, endIdx);
      
      const weekViews = weekData.reduce((sum, day) => sum + day.views, 0);
      const weekVisitors = weekData.reduce((sum, day) => sum + day.uniqueVisitors, 0);
      
      const startDate = new Date(weekData[0].date);
      const endDate = new Date(weekData[weekData.length - 1].date);
      const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      aggregatedData.push({
        views: weekViews,
        visitors: weekVisitors,
        label: weeks[i],
        dateRange: dateRange
      });
    }
  } else if (data.length <= 90) {
    // 90 days: Aggregate by month
    const months = {};
    
    data.forEach(day => {
      const date = new Date(day.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!months[monthKey]) {
        months[monthKey] = {
          views: 0,
          visitors: 0,
          days: [],
          monthName: date.toLocaleDateString('en-US', { month: 'short' })
        };
      }
      
      months[monthKey].views += day.views;
      months[monthKey].visitors += day.uniqueVisitors;
      months[monthKey].days.push(day);
    });
    
    // Convert to array and create date ranges
    Object.keys(months).forEach(monthKey => {
      const month = months[monthKey];
      const startDate = new Date(month.days[0].date);
      const endDate = new Date(month.days[month.days.length - 1].date);
      const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      aggregatedData.push({
        views: month.views,
        visitors: month.visitors,
        label: month.monthName,
        dateRange: dateRange
      });
    });
  } else {
    // 1 year: Aggregate by quarter (showing 5 quarters spanning year boundary)
    const quarterGroups = {};
    
    data.forEach(day => {
      const date = new Date(day.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const quarter = Math.floor(month / 3) + 1; // 1, 2, 3, 4
      const quarterKey = `Q${quarter} ${year}`;
      
      if (!quarterGroups[quarterKey]) {
        quarterGroups[quarterKey] = {
          views: 0,
          visitors: 0,
          days: [],
          quarter: quarter,
          year: year,
          label: quarterKey
        };
      }
      
      quarterGroups[quarterKey].views += day.views;
      quarterGroups[quarterKey].visitors += day.uniqueVisitors;
      quarterGroups[quarterKey].days.push(day);
    });
    
    // Sort quarters chronologically
    const sortedQuarters = Object.keys(quarterGroups).sort((a, b) => {
      const [qA, yearA] = a.split(' ');
      const [qB, yearB] = b.split(' ');
      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
      return parseInt(qA.substring(1)) - parseInt(qB.substring(1));
    });
    
    // Create aggregated data for each quarter
    sortedQuarters.forEach(quarterKey => {
      const q = quarterGroups[quarterKey];
      if (q.days.length > 0) {
        const startDate = new Date(q.days[0].date);
        const endDate = new Date(q.days[q.days.length - 1].date);
        const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short' })} - ${endDate.toLocaleDateString('en-US', { month: 'short' })}`;
        
        aggregatedData.push({
          views: q.views,
          visitors: q.visitors,
          label: quarterKey,
          dateRange: dateRange
        });
      }
    });
  }

  // Extract data for chart
  const viewsData = aggregatedData.map(d => d.views);
  const visitorsData = aggregatedData.map(d => d.visitors);
  categories = aggregatedData.map(d => d.label);
  dateRanges = aggregatedData.map(d => d.dateRange);

  // Calculate summary stats
  const totalViews = viewsData.reduce((sum, val) => sum + val, 0);
  const totalVisitors = visitorsData.reduce((sum, val) => sum + val, 0);
  const avgViews = Math.round(totalViews / aggregatedData.length);

  const timestamp = Date.now();
  
  return `
    <div id="chart-panel-${range}-${timestamp}" role="tabpanel" aria-labelledby="chart-range-${range}">
      <div class="chart-container__chart traffic-chart">
        <div class="traffic-chart__summary">
          <div class="traffic-chart__stat">
            <span class="traffic-chart__stat-value">${totalViews.toLocaleString()}</span>
            <span class="traffic-chart__stat-label">Total Views</span>
          </div>
          <div class="traffic-chart__stat">
            <span class="traffic-chart__stat-value">${totalVisitors.toLocaleString()}</span>
            <span class="traffic-chart__stat-label">Unique Visitors</span>
          </div>
          <div class="traffic-chart__stat">
            <span class="traffic-chart__stat-value">${avgViews.toLocaleString()}</span>
            <span class="traffic-chart__stat-label">Avg/Day</span>
          </div>
        </div>
        <div id="traffic-chart-${range}-${timestamp}" class="traffic-chart__chart-element"></div>
      </div>
    </div>
    <script>
      (function() {
        function initChart() {
          const chartElement = document.getElementById('traffic-chart-${range}-${timestamp}');
          if (!chartElement) {
            console.error('Chart element not found: traffic-chart-${range}-${timestamp}');
            return;
          }
          
          if (typeof ApexCharts === 'undefined') {
            console.error('ApexCharts not loaded');
            return;
          }
          
          const isDark = document.documentElement.classList.contains('dark');
          
          try {
            const chart = new ApexCharts(chartElement, {
          chart: {
            height: '80%',
            type: 'line',
            sparkline: {
              enabled: false
            },
                toolbar: { show: false },
                zoom: { enabled: false },
                fontFamily: 'Inter, ui-sans-serif',
              },
              series: [
                {
                  name: 'Page Views',
                  data: ${JSON.stringify(viewsData)}
                },
                {
                  name: 'Unique Visitors',
                  data: ${JSON.stringify(visitorsData)}
                }
              ],
              stroke: {
                curve: 'straight',
                width: [3, 2]
              },
              colors: isDark ? ['#60a5fa', '#34d399'] : ['#2563eb', '#10b981'],
              grid: {
                strokeDashArray: 2,
                borderColor: isDark ? '#374151' : '#e5e7eb',
                padding: { top: 0, right: 10, bottom: 10, left: 10 },
                xaxis: {
                  lines: {
                    show: true
                  }
                }
              },
              xaxis: {
                type: 'category',
                categories: ${JSON.stringify(categories)},
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                  style: {
                    colors: isDark ? '#9ca3af' : '#6b7280',
                    fontSize: '11px',
                  }
                },
                tooltip: { enabled: false }
              },
              yaxis: {
                labels: {
                  style: {
                    colors: isDark ? '#9ca3af' : '#6b7280',
                    fontSize: '11px',
                  },
                  formatter: (value) => value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value
                }
              },
          legend: {
            show: true,
            position: 'bottom',
            horizontalAlign: 'center',
            fontSize: '12px',
            markers: { size: 6 },
            itemMargin: { horizontal: 15 },
            labels: {
              colors: isDark ? '#9ca3af' : '#6b7280'
            }
          },
              tooltip: {
                shared: true,
                intersect: false,
                theme: isDark ? 'dark' : 'light',
                x: {
                  show: true,
                  formatter: function(val, opts) {
                    const dateRanges = ${JSON.stringify(dateRanges)};
                    const index = opts.dataPointIndex;
                    const label = ${JSON.stringify(categories)}[index];
                    const dateRange = dateRanges[index];
                    return label + '<br><span class="traffic-chart__tooltip-date">' + dateRange + '</span>';
                  }
                },
                y: {
                  formatter: (value) => value.toLocaleString()
                }
              },
              markers: {
                size: 4,
                strokeWidth: 0,
                hover: { size: 6 }
              }
            });
            
            chart.render();
            console.log('Chart rendered successfully for ${range}');
          } catch (error) {
            console.error('Error rendering chart:', error);
          }
        }
        
        // Wait for DOM and ApexCharts to be ready
        function waitForApexCharts(callback, retries = 50) {
          if (typeof ApexCharts !== 'undefined') {
            callback();
          } else if (retries > 0) {
            setTimeout(() => waitForApexCharts(callback, retries - 1), 100);
          } else {
            console.error('ApexCharts failed to load after 5 seconds');
          }
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => waitForApexCharts(initChart));
        } else {
          waitForApexCharts(initChart);
        }
      })();
    </script>
  `;
}

// Helper function for stats fragment (for HTMX refresh)
function statsFragment(stats) {
  return `
    <div class="quick-stats">
      <div class="quick-stat">
        <div class="quick-stat__icon quick-stat__icon--posts">
          <i data-lucide="file-text"></i>
        </div>
        <div class="quick-stat__content">
          <span class="quick-stat__label">Total Posts</span>
          <span class="quick-stat__value">${stats.totalPosts}</span>
          <span class="quick-stat__change quick-stat__change--up">
            <i data-lucide="trending-up"></i>
            12% from last month
          </span>
        </div>
      </div>
      <div class="quick-stat">
        <div class="quick-stat__icon quick-stat__icon--views">
          <i data-lucide="eye"></i>
        </div>
        <div class="quick-stat__content">
          <span class="quick-stat__label">Page Views</span>
          <span class="quick-stat__value">${stats.totalViews}</span>
          <span class="quick-stat__change quick-stat__change--up">
            <i data-lucide="trending-up"></i>
            8% from last month
          </span>
        </div>
      </div>
      <div class="quick-stat">
        <div class="quick-stat__icon quick-stat__icon--comments">
          <i data-lucide="message-square"></i>
        </div>
        <div class="quick-stat__content">
          <span class="quick-stat__label">Comments</span>
          <span class="quick-stat__value">${stats.totalComments}</span>
          <span class="quick-stat__change quick-stat__change--down">
            <i data-lucide="trending-down"></i>
            3% from last month
          </span>
        </div>
      </div>
      <div class="quick-stat">
        <div class="quick-stat__icon quick-stat__icon--users">
          <i data-lucide="users"></i>
        </div>
        <div class="quick-stat__content">
          <span class="quick-stat__label">Subscribers</span>
          <span class="quick-stat__value">${stats.totalSubscribers}</span>
          <span class="quick-stat__change quick-stat__change--up">
            <i data-lucide="trending-up"></i>
            24% from last month
          </span>
        </div>
      </div>
    </div>
  `;
}

// Helper function for activity fragment
function activityFragment(items) {
  if (!items || items.length === 0) {
    return `
      <div class="text-center py-8 text-gray-500">
        <i data-lucide="activity" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
        <p>No recent activity</p>
      </div>
    `;
  }

  return items
    .map(
      (item) => `
    <div class="activity-timeline__item">
      <div class="activity-timeline__dot activity-timeline__dot--${item.type}">
        <i data-lucide="${item.icon}"></i>
      </div>
      <div class="activity-timeline__content">
        <p class="activity-timeline__text">${item.text}</p>
        <span class="activity-timeline__time">${item.time}</span>
      </div>
    </div>
  `,
    )
    .join('');
}

// Helper function for top posts fragment
function topPostsFragment(posts) {
  if (!posts || posts.length === 0) {
    return `
      <div class="text-center py-8 text-gray-500">
        <i data-lucide="trending-up" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
        <p>No posts</p>
      </div>
    `;
  }

  return posts
    .map(
      (post, index) => `
    <div class="top-list__item">
      <div class="top-list__left">
        <span class="top-list__rank top-list__rank--${post.categoryColor || 'primary'}">${index + 1}</span>
        <div class="top-list__info">
          <p class="top-list__title">${post.title}</p>
          <span class="top-list__url">${post.url}</span>
        </div>
      </div>
      <div class="top-list__right">
        <span class="top-list__value">${post.views}</span>
        <span class="top-list__change top-list__change--${post.trend}">
          <i data-lucide="${post.trend === 'up' ? 'trending-up' : 'trending-down'}"></i>
          ${post.change}%
        </span>
      </div>
    </div>
  `,
    )
    .join('');
}

// Export singleton
export const dashboardController = new DashboardController();
export default dashboardController;
