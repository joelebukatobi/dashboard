#!/usr/bin/env node
/**
 * Unified CLI for maintenance tasks.
 *
 * Usage:
 *   node scripts/cli.js db test
 *   node scripts/cli.js db recalculate-counts
 *   node scripts/cli.js setup-token [--json]
 *   node scripts/cli.js analytics day [--days=N] [--backdate] [--force]
 *   node scripts/cli.js analytics run
 *   node scripts/cli.js analytics aggregate
 *   node scripts/cli.js analytics scheduler
 *   node scripts/cli.js media thumbnails [--regenerate]
 *   node scripts/cli.js media clear
 *   node scripts/cli.js media cleanup
 *   node scripts/cli.js maintenance reset-password [--email=] [--password=]
 *   node scripts/cli.js maintenance update-views
 *   node scripts/cli.js maintenance update-colors
 */

const HELP = `
Maintenance CLI

  db
    test                  Test database connection
    recalculate-counts    Recalculate category post counts

  setup-token [--json]    Generate first-launch setup URL

  analytics
    day [flags]           Simulate daily analytics (--days, --backdate, --force)
    run                   Run one day of the 7-day simulation engine
    aggregate             Aggregate views into daily_page_views
    scheduler             Cron scheduler for analytics run (blocking)

  media
    thumbnails [--regenerate]
    clear                 Remove seeded images (keeps source files)
    cleanup               Keep only 2 most recent image records

  maintenance
    reset-password [--email=] [--password=]
    update-views          Randomize post view counts (dev/demo)
    update-colors         Reset category badge colors
`.trim();

async function run(handler, args = []) {
  try {
    await handler(args);
    if (handler.name !== 'runScheduler') {
      process.exit(0);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const [command, subcommand, ...rest] = process.argv.slice(2);
  const args = subcommand?.startsWith('--') ? [subcommand, ...rest] : rest;

  if (!command || command === 'help' || command === '--help') {
    console.log(HELP);
    process.exit(0);
  }

  switch (command) {
    case 'db': {
      const db = await import('./lib/tasks/db.js');
      if (subcommand === 'test') return run(db.testConnection);
      if (subcommand === 'recalculate-counts') return run(db.recalculatePostCounts);
      break;
    }

    case 'setup-token':
      return run((await import('./lib/tasks/setup.js')).generateSetupToken, [subcommand, ...rest].filter(Boolean));

    case 'analytics': {
      const analytics = await import('./lib/tasks/analytics.js');
      if (subcommand === 'day') return run(analytics.simulateDay, args);
      if (subcommand === 'run') return run(analytics.runSimulation);
      if (subcommand === 'aggregate') return run(analytics.aggregateDailyViews);
      if (subcommand === 'scheduler') return run(analytics.runScheduler);
      break;
    }

    case 'media': {
      const media = await import('./lib/tasks/media.js');
      if (subcommand === 'thumbnails') return run(media.generateThumbnails, args);
      if (subcommand === 'clear') return run(media.clearImages);
      if (subcommand === 'cleanup') return run(media.cleanupDuplicates);
      break;
    }

    case 'maintenance': {
      const maintenance = await import('./lib/tasks/maintenance.js');
      if (subcommand === 'reset-password') return run(maintenance.resetAdminPassword, args);
      if (subcommand === 'update-views') return run(maintenance.updatePostViews);
      if (subcommand === 'update-colors') return run(maintenance.updateCategoryColors);
      break;
    }

    default:
      break;
  }

  console.error(`Unknown command: ${command}${subcommand ? ` ${subcommand}` : ''}\n`);
  console.log(HELP);
  process.exit(1);
}

main();
