/**
 * Hosted dev and production must use real traffic only.
 * Local machines run with NODE_ENV=development.
 */
export function assertLocalDevelopment(taskName) {
  if (process.env.ALLOW_LOCAL_SIMULATION === 'true') {
    return;
  }

  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      `${taskName} is disabled outside local development. ` +
      'Hosted environments must collect traffic from real page views.',
    );
  }
}
