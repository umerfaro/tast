const express = require('express');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { marked } = require('marked');
const { db } = require('../db');

const router = express.Router();

// Helper to calculate simple word count
function getWordCount(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

// Multer setup for file uploads (2MB max, memory storage for clean parsing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
      cb(null, true);
    } else {
      const err = new Error('UNSUPPORTED_FILE_TYPE');
      err.code = 'UNSUPPORTED_FILE_TYPE';
      cb(err);
    }
  }
});

// Helper: Check user access to a document
function getDocumentWithAccess(docId, userId) {
  const doc = db.prepare(`
    SELECT d.*, u.name as owner_name, u.email as owner_email, u.avatar_color as owner_avatar
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    WHERE d.id = ?
  `).get(docId);

  if (!doc) {
    return { status: 404, error: 'Document not found' };
  }

  // Is owner?
  if (doc.owner_id === userId) {
    return {
      status: 200,
      document: doc,
      access: 'owner',
      canEdit: true,
      canShare: true,
      canDelete: true
    };
  }

  // Is shared?
  const share = db.prepare(`
    SELECT permission FROM document_shares
    WHERE document_id = ? AND user_id = ?
  `).get(docId, userId);

  if (share) {
    return {
      status: 200,
      document: doc,
      access: share.permission, // 'editor' or 'viewer'
      canEdit: share.permission === 'editor',
      canShare: false,
      canDelete: false
    };
  }

  // No access
  return {
    status: 403,
    error: 'Access denied. You do not have permission to view or edit this document.'
  };
}

// ----------------------------------------------------
// 1. GET /api/documents - List owned & shared documents
// ----------------------------------------------------
router.get('/', (req, res) => {
  const userId = req.user.id;

  // Owned documents
  const ownedDocs = db.prepare(`
    SELECT d.id, d.title, d.owner_id, d.created_at, d.updated_at,
           u.name as owner_name, u.email as owner_email, u.avatar_color as owner_avatar,
           length(d.content) as content_length
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    WHERE d.owner_id = ?
    ORDER BY d.updated_at DESC
  `).all(userId);

  // Shared with me documents
  const sharedDocs = db.prepare(`
    SELECT d.id, d.title, d.owner_id, d.created_at, d.updated_at,
           u.name as owner_name, u.email as owner_email, u.avatar_color as owner_avatar,
           s.permission, s.created_at as shared_at,
           length(d.content) as content_length
    FROM document_shares s
    JOIN documents d ON s.document_id = d.id
    JOIN users u ON d.owner_id = u.id
    WHERE s.user_id = ?
    ORDER BY d.updated_at DESC
  `).all(userId);

  res.json({
    owned: ownedDocs.map(d => ({ ...d, permission: 'owner' })),
    shared: sharedDocs
  });
});

// ----------------------------------------------------
// 2. GET /api/documents/:id - Read document & permissions
// ----------------------------------------------------
router.get('/:id', (req, res) => {
  const result = getDocumentWithAccess(req.params.id, req.user.id);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }

  // If user has access, fetch document shares for display if owner or editor
  let shares = [];
  if (result.canShare || result.access === 'editor') {
    shares = db.prepare(`
      SELECT s.id, s.user_id, s.permission, s.created_at,
             u.name, u.email, u.avatar_color, u.role_title
      FROM document_shares s
      JOIN users u ON s.user_id = u.id
      WHERE s.document_id = ?
      ORDER BY u.name ASC
    `).all(req.params.id);
  }

  res.json({
    document: result.document,
    access: result.access,
    canEdit: result.canEdit,
    canShare: result.canShare,
    canDelete: result.canDelete,
    shares
  });
});

// ----------------------------------------------------
// 3. POST /api/documents - Create new document
// ----------------------------------------------------
router.post('/', (req, res) => {
  const userId = req.user.id;
  const title = (req.body.title || 'Untitled Document').trim() || 'Untitled Document';
  const content = req.body.content || '<p></p>';
  const docId = 'doc_' + crypto.randomUUID().slice(0, 12);

  db.prepare(`
    INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(docId, title, content, userId);

  const newDoc = db.prepare(`
    SELECT d.*, u.name as owner_name, u.email as owner_email, u.avatar_color as owner_avatar
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    WHERE d.id = ?
  `).get(docId);

  res.status(201).json({
    document: newDoc,
    access: 'owner',
    canEdit: true,
    canShare: true,
    canDelete: true,
    shares: []
  });
});

// ----------------------------------------------------
// 4. PUT /api/documents/:id - Update document (content / title)
// ----------------------------------------------------
router.put('/:id', (req, res) => {
  const result = getDocumentWithAccess(req.params.id, req.user.id);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }

  if (!result.canEdit) {
    return res.status(403).json({
      error: 'View-only access. You do not have permission to edit this document.'
    });
  }

  const { title, content } = req.body;
  const currentDoc = result.document;

  const newTitle = title !== undefined ? (title.trim() || 'Untitled Document') : currentDoc.title;
  const newContent = content !== undefined ? content : currentDoc.content;

  db.prepare(`
    UPDATE documents
    SET title = ?, content = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, newContent, req.params.id);

  const updatedDoc = db.prepare(`
    SELECT d.*, u.name as owner_name, u.email as owner_email, u.avatar_color as owner_avatar
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    WHERE d.id = ?
  `).get(req.params.id);

  res.json({
    document: updatedDoc,
    access: result.access,
    canEdit: result.canEdit
  });
});

// ----------------------------------------------------
// 5. DELETE /api/documents/:id - Delete document (owner only)
// ----------------------------------------------------
router.delete('/:id', (req, res) => {
  const result = getDocumentWithAccess(req.params.id, req.user.id);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }

  if (!result.canDelete) {
    return res.status(403).json({
      error: 'Only the document owner can delete this document.'
    });
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Document deleted successfully' });
});

// ----------------------------------------------------
// 6. POST /api/documents/:id/share - Grant or update share
// ----------------------------------------------------
router.post('/:id/share', (req, res) => {
  const result = getDocumentWithAccess(req.params.id, req.user.id);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }

  if (!result.canShare) {
    return res.status(403).json({
      error: 'Only the document owner can manage sharing permissions.'
    });
  }

  const { email, userId: targetUserIdInput, permission } = req.body;

  // Validate permission
  const validPermission = permission === 'viewer' ? 'viewer' : 'editor';

  // Find target user by email or ID
  let targetUser;
  if (targetUserIdInput) {
    targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserIdInput);
  } else if (email) {
    targetUser = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email.trim());
  }

  if (!targetUser) {
    return res.status(404).json({
      error: 'User not found. Please select a valid Ajaia team member.'
    });
  }

  // Cannot share with self (the owner)
  if (targetUser.id === req.user.id) {
    return res.status(400).json({
      error: 'You are already the owner of this document.'
    });
  }

  const shareId = 'shr_' + crypto.randomUUID().slice(0, 10);

  // Insert or update share
  db.prepare(`
    INSERT INTO document_shares (id, document_id, user_id, permission, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(document_id, user_id) DO UPDATE SET
      permission = excluded.permission
  `).run(shareId, req.params.id, targetUser.id, validPermission);

  const updatedShares = db.prepare(`
    SELECT s.id, s.user_id, s.permission, s.created_at,
           u.name, u.email, u.avatar_color, u.role_title
      FROM document_shares s
      JOIN users u ON s.user_id = u.id
      WHERE s.document_id = ?
      ORDER BY u.name ASC
  `).all(req.params.id);

  res.json({
    success: true,
    shares: updatedShares,
    message: `Granted ${validPermission} access to ${targetUser.name}`
  });
});

// ----------------------------------------------------
// 7. DELETE /api/documents/:id/share/:userId - Revoke share
// ----------------------------------------------------
router.delete('/:id/share/:userId', (req, res) => {
  const result = getDocumentWithAccess(req.params.id, req.user.id);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }

  if (!result.canShare) {
    return res.status(403).json({
      error: 'Only the document owner can revoke access.'
    });
  }

  db.prepare(`
    DELETE FROM document_shares
    WHERE document_id = ? AND user_id = ?
  `).run(req.params.id, req.params.userId);

  const remainingShares = db.prepare(`
    SELECT s.id, s.user_id, s.permission, s.created_at,
           u.name, u.email, u.avatar_color, u.role_title
      FROM document_shares s
      JOIN users u ON s.user_id = u.id
      WHERE s.document_id = ?
      ORDER BY u.name ASC
  `).all(req.params.id);

  res.json({
    success: true,
    shares: remainingShares,
    message: 'Access revoked successfully'
  });
});

// ----------------------------------------------------
// 8. POST /api/documents/upload - Import file as new document
// ----------------------------------------------------
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size exceeds 2MB limit. Please upload a smaller file.'
        });
      }
      if (err.code === 'UNSUPPORTED_FILE_TYPE' || err.message === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(400).json({
          error: 'Unsupported file type. Only .txt and .md files are supported.'
        });
      }
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please choose a .txt or .md file.' });
    }

    const rawContent = req.file.buffer.toString('utf-8');
    if (!rawContent || rawContent.trim().length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty.' });
    }

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);

    let htmlContent = '';
    let parsedTitle = baseName;

    if (ext === '.md' || ext === '.markdown') {
      // Parse markdown to HTML
      htmlContent = marked.parse(rawContent);

      // Check if markdown starts with an H1 (# Title)
      const h1Match = rawContent.match(/^#\s+(.+)$/m);
      if (h1Match && h1Match[1]) {
        parsedTitle = h1Match[1].trim();
      }
    } else {
      // Plain text: split into paragraphs
      htmlContent = rawContent
        .split(/\r?\n\r?\n/)
        .map(p => `<p>${p.trim().replace(/\r?\n/g, '<br/>')}</p>`)
        .join('');
    }

    const docId = 'doc_' + crypto.randomUUID().slice(0, 12);
    const userId = req.user.id;

    db.prepare(`
      INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(docId, parsedTitle, htmlContent, userId);

    const newDoc = db.prepare(`
      SELECT d.*, u.name as owner_name, u.email as owner_email, u.avatar_color as owner_avatar
      FROM documents d
      JOIN users u ON d.owner_id = u.id
      WHERE d.id = ?
    `).get(docId);

    res.status(201).json({
      document: newDoc,
      access: 'owner',
      canEdit: true,
      canShare: true,
      canDelete: true,
      shares: [],
      message: `Successfully imported "${originalName}"`
    });
  });
});

module.exports = router;
