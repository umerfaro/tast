const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'ajaia_docs.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar_color TEXT NOT NULL,
      role_title TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      owner_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission TEXT NOT NULL CHECK(permission IN ('editor', 'viewer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(document_id, user_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, avatar_color, role_title)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run('usr_alice', 'Alice Chen', 'alice@ajaia.internal', '#4f46e5', 'Product Lead');
    insertUser.run('usr_bob', 'Bob Martinez', 'bob@ajaia.internal', '#059669', 'Staff Engineer');
    insertUser.run('usr_charlie', 'Charlie Kim', 'charlie@ajaia.internal', '#d97706', 'Growth Designer');
  }

  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
  if (docCount === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-1 hour'))
    `);

    // Doc 1: Alice's Product Strategy (shared with Bob as Editor)
    const doc1Id = 'doc_prod_strat';
    const doc1Content = `
      <h1>Ajaia Product Vision & Strategy (Q4)</h1>
      <p>Welcome to the collaborative workspace for the <strong>Ajaia internal tools initiative</strong>. Our goal is to streamline asynchronous knowledge sharing across distributed product and engineering squads.</p>
      <h2>Key Strategic Pillars</h2>
      <ul>
        <li><strong>Frictionless Authoring:</strong> Rich formatting with zero lag and instant persistence.</li>
        <li><strong>Explicit Permissions:</strong> Clear document ownership and role-based access.</li>
        <li><strong>Document Portability:</strong> Import markdown and structured notes directly.</li>
      </ul>
      <h2>Action Items for Review</h2>
      <ol>
        <li>Review engineering benchmarks with Bob.</li>
        <li>Finalize typography scale and canvas margins.</li>
        <li>Conduct permission matrix walkthrough.</li>
      </ol>
      <p><em>Note: This document is shared with Bob Martinez with full editing permissions.</em></p>
    `.trim();
    insertDoc.run(doc1Id, 'Q4 Product Strategy & Roadmap', doc1Content, 'usr_alice');

    // Doc 2: Bob's Engineering Architecture Spec (shared with Alice as Editor)
    const doc2Id = 'doc_eng_arch';
    const doc2Content = `
      <h1>Engineering Architecture: Document Engine</h1>
      <p>This technical brief details the design decisions behind the Ajaia document editing pipeline.</p>
      <h2>Persistence & Storage</h2>
      <p>We selected <strong>SQLite with Write-Ahead Logging (WAL)</strong> for embedded resilience and zero external database overhead.</p>
      <h2>Security & Isolation</h2>
      <ul>
        <li>Strict database-level foreign keys with cascading deletes.</li>
        <li>403 Forbidden enforcement on any unauthorized access attempt.</li>
      </ul>
    `.trim();
    insertDoc.run(doc2Id, 'Engineering Architecture: Document Engine', doc2Content, 'usr_bob');

    // Doc 3: Alice's Private Document (Not shared with anyone!)
    const doc3Id = 'doc_confidential';
    const doc3Content = `
      <h1>Private: Q4 Leadership Planning & Allocations</h1>
      <p><strong>Strictly Confidential</strong> — Ajaia Executive Leadership Only.</p>
      <p>This document is owned by Alice Chen and is <em>not shared with any other users</em>. Any attempt by Bob or Charlie to view or edit this document must result in an immediate <strong>403 Forbidden</strong> response.</p>
      <h2>Key Review Points</h2>
      <ul>
        <li>Headcount budget allocation.</li>
        <li>Internal tooling ROI metrics.</li>
      </ul>
    `.trim();
    insertDoc.run(doc3Id, 'Confidential: Leadership Planning', doc3Content, 'usr_alice');

    // Share Doc 1 with Bob (Editor)
    const insertShare = db.prepare(`
      INSERT INTO document_shares (id, document_id, user_id, permission, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    insertShare.run('shr_1', doc1Id, 'usr_bob', 'editor');

    // Share Doc 2 with Alice (Editor)
    insertShare.run('shr_2', doc2Id, 'usr_alice', 'editor');
  }
}

// Initialize on load
initSchema();
seedData();

module.exports = {
  db,
  initSchema,
  seedData
};
