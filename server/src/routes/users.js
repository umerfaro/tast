const express = require('express');
const { db } = require('../db');

const router = express.Router();

// List all seeded users
router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, name, email, avatar_color, role_title FROM users ORDER BY name ASC').all();
  res.json({ users });
});

// Get current active user info
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
