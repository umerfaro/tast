const app = require('./app');
const { initSchema, seedData } = require('./db');

// Ensure DB is initialized and seeded
initSchema();
seedData();

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Ajaia Document Editor Server running on http://localhost:${PORT}`);
  console.log(`📁 Persistence: SQLite at ./data/ajaia_docs.db`);
  console.log(`👥 Seeded Personas:`);
  console.log(`   - Alice Chen (usr_alice) -> alice@ajaia.internal [Product Lead]`);
  console.log(`   - Bob Martinez (usr_bob) -> bob@ajaia.internal [Staff Engineer]`);
  console.log(`   - Charlie Kim (usr_charlie) -> charlie@ajaia.internal [Growth Designer]`);
  console.log(`=======================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is currently held by a suspended or previous process.`);
    console.error(`👉 Automatically freeing port... Run 'npm start' again or use 'npm run kill'.\n`);
    process.exit(1);
  }
});

// Gracefully release port on Ctrl+C (SIGINT) and Ctrl+Z (SIGTSTP)
function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGTSTP', shutdown);
