export default {
  duration: 7,
  runTime: '0 9 * * *',

  categories: {
    trendingUp: ['React Hooks', 'CSS Grid', 'TypeScript Patterns'],
    trendingDown: ['Docker', 'PostgreSQL', 'Web Security'],
    excluded: ['Async/Await', 'Responsive Design'],
  },

  dailyTargets: {
    views: { min: 100, max: 200 },
    comments: { min: 3, max: 7 },
    subscribers: { min: 2, max: 4 },
  },

  dayMultipliers: {
    1: 0.8,
    2: 1.0,
    3: 0.9,
    4: 1.2,
    5: 1.1,
    6: 0.85,
    7: 1.15,
  },

  viewRanges: {
    trendingUp: { min: 40, max: 60 },
    trendingDown: { min: 5, max: 12 },
    stable: { min: 15, max: 25 },
    excluded: { min: 0, max: 0 },
  },

  commentTemplates: [
    'Great post! Really helpful.',
    'Thanks for sharing this.',
    'Exactly what I was looking for.',
    'Well explained, thanks!',
    'This is super useful.',
    'Can you elaborate on this?',
    'Bookmarked for later.',
    'Simple and clear explanation.',
  ],

  subscriberNames: [
    'John Smith', 'Emma Wilson', 'Michael Brown', 'Sarah Davis',
    'David Miller', 'Lisa Garcia', 'James Johnson', 'Jennifer Lee',
    'Robert Taylor', 'Maria Anderson', 'William Martinez', 'Patricia White',
    'Thomas Robinson', 'Linda Clark', 'Charles Rodriguez', 'Barbara Lewis',
  ],
};
