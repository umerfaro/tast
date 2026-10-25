const { db } = require('./db');

function authMiddleware(req, res, next) {
  // Support user identification via x-user-id header or query param
  const userId = req.headers['x-user-id'] || req.query.user_id || 'usr_alice';

  const user = db.prepare('SELECT id, name, email, avatar_color, role_title FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(401).json({
      error: `Unauthorized: User '${userId}' not found.`
    });
  }

  req.user = user;
  next();
}

module.exports = {
  authMiddleware
};
