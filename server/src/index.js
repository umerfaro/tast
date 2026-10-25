const app = require('./app');
const { initSchema, seedData } = require('./db');

// Ensure DB is initialized and seeded
initSchema();
seedData();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Ajaia Document Editor Server running on http://localhost:${PORT}`);
  console.log(`📁 Persistence: SQLite at ./data/ajaia_docs.db`);
  console.log(`👥 Seeded Personas:`);
  console.log(`   - Alice Chen (usr_alice) -> alice@ajaia.internal [Product Lead]`);
  console.log(`   - Bob Martinez (usr_bob) -> bob@ajaia.internal [Staff Engineer]`);
  console.log(`   - Charlie Kim (usr_charlie) -> charlie@ajaia.internal [Growth Designer]`);
  console.log(`=======================================================`);
});
