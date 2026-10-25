import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { db } from '../src/db.js';

describe('Ajaia Collaborative Document Editor — End-to-End Test Suite', () => {
  let testDocId = '';

  // --------------------------------------------------------------------------
  // 1. Document Creation & Editing
  // --------------------------------------------------------------------------
  describe('Document Creation & Editing', () => {
    it('creates a new document with rich formatting under the active user (Alice)', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('x-user-id', 'usr_alice')
        .send({
          title: 'Q4 Product Roadmap Draft',
          content: '<h1>Q4 Roadmap</h1><p>Key priorities: <strong>Growth</strong> and <em>Retention</em>.</p>'
        });

      expect(res.status).toBe(201);
      expect(res.body.document).toBeDefined();
      expect(res.body.document.title).toBe('Q4 Product Roadmap Draft');
      expect(res.body.document.owner_id).toBe('usr_alice');
      expect(res.body.access).toBe('owner');
      expect(res.body.canEdit).toBe(true);

      testDocId = res.body.document.id;
    });

    it('fetches document by ID and verifies content and ownership', async () => {
      const res = await request(app)
        .get(`/api/documents/${testDocId}`)
        .set('x-user-id', 'usr_alice');

      expect(res.status).toBe(200);
      expect(res.body.document.id).toBe(testDocId);
      expect(res.body.document.title).toBe('Q4 Product Roadmap Draft');
      expect(res.body.access).toBe('owner');
    });

    it('renames and edits document content as owner', async () => {
      const updatedContent = '<h1>Q4 Roadmap (v2)</h1><ul><li>Bullet item 1</li><li>Bullet item 2</li></ul>';
      const res = await request(app)
        .put(`/api/documents/${testDocId}`)
        .set('x-user-id', 'usr_alice')
        .send({
          title: 'Q4 Product Roadmap (Finalized)',
          content: updatedContent
        });

      expect(res.status).toBe(200);
      expect(res.body.document.title).toBe('Q4 Product Roadmap (Finalized)');
      expect(res.body.document.content).toBe(updatedContent);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Sharing & Permission Enforcement
  // --------------------------------------------------------------------------
  describe('Sharing & Access Control Enforcement', () => {
    it('denies access to unshared user (Charlie) with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/documents/${testDocId}`)
        .set('x-user-id', 'usr_charlie');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    });

    it('denies edit attempt by unshared user (Charlie) with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/api/documents/${testDocId}`)
        .set('x-user-id', 'usr_charlie')
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    });

    it('allows owner (Alice) to share document with Bob as "editor"', async () => {
      const res = await request(app)
        .post(`/api/documents/${testDocId}/share`)
        .set('x-user-id', 'usr_alice')
        .send({
          userId: 'usr_bob',
          permission: 'editor'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.shares).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ user_id: 'usr_bob', permission: 'editor' })
        ])
      );
    });

    it('allows shared user (Bob) with editor permission to open the document', async () => {
      const res = await request(app)
        .get(`/api/documents/${testDocId}`)
        .set('x-user-id', 'usr_bob');

      expect(res.status).toBe(200);
      expect(res.body.document.id).toBe(testDocId);
      expect(res.body.access).toBe('editor');
      expect(res.body.canEdit).toBe(true);
      expect(res.body.canDelete).toBe(false);
    });

    it('allows shared user (Bob) to edit document content', async () => {
      const res = await request(app)
        .put(`/api/documents/${testDocId}`)
        .set('x-user-id', 'usr_bob')
        .send({
          content: '<p>Updated collaboratively by Bob Martinez</p>'
        });

      expect(res.status).toBe(200);
      expect(res.body.document.content).toContain('Bob Martinez');
    });

    it('denies non-owner (Bob) from deleting the document with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/documents/${testDocId}`)
        .set('x-user-id', 'usr_bob');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Only the document owner can delete/i);
    });

    it('updates Bob permission to "viewer" and blocks subsequent edits', async () => {
      // Alice downgrades Bob to viewer
      const shareRes = await request(app)
        .post(`/api/documents/${testDocId}/share`)
        .set('x-user-id', 'usr_alice')
        .send({
          userId: 'usr_bob',
          permission: 'viewer'
        });
      expect(shareRes.status).toBe(200);

      // Bob tries to edit
      const editRes = await request(app)
        .put(`/api/documents/${testDocId}`)
        .set('x-user-id', 'usr_bob')
        .send({ content: '<p>Should fail because Bob is viewer</p>' });

      expect(editRes.status).toBe(403);
      expect(editRes.body.error).toMatch(/View-only access/i);
    });

    it('lists document under "Shared with me" for Bob and "Owned" for Alice', async () => {
      const aliceList = await request(app)
        .get('/api/documents')
        .set('x-user-id', 'usr_alice');

      const bobList = await request(app)
        .get('/api/documents')
        .set('x-user-id', 'usr_bob');

      const charlieList = await request(app)
        .get('/api/documents')
        .set('x-user-id', 'usr_charlie');

      expect(aliceList.body.owned.some(d => d.id === testDocId)).toBe(true);
      expect(bobList.body.shared.some(d => d.id === testDocId)).toBe(true);
      expect(charlieList.body.owned.some(d => d.id === testDocId)).toBe(false);
      expect(charlieList.body.shared.some(d => d.id === testDocId)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. File Upload & Validation (.md / .txt to editable document)
  // --------------------------------------------------------------------------
  describe('File Upload & Document Import', () => {
    it('imports a .md markdown file into a formatted editable document', async () => {
      const mdContent = `# Engineering RFC: Real-Time Sync\n\n## Overview\nThis document evaluates **WebSockets vs HTTP polling**.\n\n- Low latency\n- Simpler debugability`;

      const res = await request(app)
        .post('/api/documents/upload')
        .set('x-user-id', 'usr_bob')
        .attach('file', Buffer.from(mdContent, 'utf-8'), 'rfc-realtime.md');

      expect(res.status).toBe(201);
      expect(res.body.document).toBeDefined();
      expect(res.body.document.title).toBe('Engineering RFC: Real-Time Sync');
      expect(res.body.document.content).toContain('<h1>Engineering RFC: Real-Time Sync</h1>');
      expect(res.body.document.content).toContain('<strong>WebSockets vs HTTP polling</strong>');
      expect(res.body.document.owner_id).toBe('usr_bob');
    });

    it('rejects unsupported file extensions with user-friendly 400 error', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('x-user-id', 'usr_alice')
        .attach('file', Buffer.from('fake pdf content', 'utf-8'), 'invoice.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Unsupported file type/i);
    });

    it('rejects empty uploaded files with 400 error', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('x-user-id', 'usr_alice')
        .attach('file', Buffer.from('', 'utf-8'), 'empty.md');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });

    it('rejects files larger than 2MB limit with 400 error', async () => {
      // 2.2MB buffer
      const largeBuffer = Buffer.alloc(2.2 * 1024 * 1024, 'a');

      const res = await request(app)
        .post('/api/documents/upload')
        .set('x-user-id', 'usr_alice')
        .attach('file', largeBuffer, 'huge_file.txt');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/exceeds 2MB limit/i);
    });
  });
});
