;(async () => {
  await import('./src/server.js');
})().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
