# Ajaia Collaborative Document Editor — Submission Report

## 1. What Is Included in This Submission

This repository contains a working, full-stack collaborative document editor designed for Ajaia internal teams.

### Included Deliverables
- **Full Source Code**:
  - Backend: Node.js, Express, SQLite persistence (`better-sqlite3`), `multer`, `marked`, REST API.
  - Frontend: React 18, Vite, TipTap (ProseMirror core), `lucide-react`, custom CSS design system.
  - Test Suite: Vitest + Supertest integration tests covering CRUD, permissions, and upload validation.
- **`README.md`**: Step-by-step local setup, prerequisites, seed personas, run commands, test commands, and demo script.
- **`ARCHITECTURE.md`**: 1-page architecture plan detailing data model, tradeoffs, deliberate cuts, storage, and access matrix.
- **`AI_WORKFLOW.md`**: Summary of AI tooling, manual verification steps, and items rejected/corrected.
- **`SUBMISSION.md`**: Comprehensive self-audit of capabilities, working features, and roadmap.

---

## 2. What Is Working (100% Implemented & Verified)

### 2.1 Document Creation & Rich-Text Editing
- **Document Creation**: `+ New Document` creates an editable document, assigns active user as owner, and navigates into editor.
- **Inline Renaming**: Real-time document title editing from the editor navbar with debounced auto-save.
- **Rich-Text Formatting (TipTap / ProseMirror)**:
  - Bold (`Cmd+B`), Italic (`Cmd+I`), Underline (`Cmd+U`)
  - Headings: Normal Text, Heading 1 (`#`), Heading 2 (`##`), Heading 3 (`###`)
  - Bulleted Lists (`<ul><li>`) and Numbered Lists (`<ol><li>`)
  - Blockquotes (`>`) and Code Blocks (`pre code`)
  - Horizontal rules (`---`)
  - Undo (`Cmd+Z`) and Redo (`Cmd+Shift+Z`)
- **Editor Polish**:
  - Live auto-save status indicator ("Saved" / "Saving..." / "Unsaved changes" / "Save failed").
  - Word counter and character counter in real-time.
  - Center-aligned Google Docs paper canvas with elevation and page margins.
  - Manual `Save` button + `Cmd+S` keyboard shortcut.
  - Back button with breadcrumb navigation to document dashboard.

### 2.2 File Upload & Document Import
- **Implemented Behavior**: Import `.md` or `.txt` file into a new editable document.
- **Supported Formats**: `.md`, `.markdown`, `.txt`.
- **Size Limits**: Maximum 2MB, enforced both client-side (immediate feedback) and backend (Multer error handling).
- **Validation**: Rejects unsupported formats (`.pdf`, `.png`, `.docx`, etc.), empty files, and oversized files with user-friendly red banners/toasts.
- **Parsing**:
  - Markdown files: Parses `# Title` into document title, and markdown syntax into semantic HTML.
  - Plain text: Converts paragraphs and line breaks into formatted document paragraphs.
- **Persistence**: Persists directly into SQLite database; visible and usable after browser reload.

### 2.3 Sharing & Access Control
- **Ownership Model**: Every document is assigned to an `owner_id`.
- **Granular Permissions**:
  - **Editor**: Can read, rename, edit content, and auto-save.
  - **Viewer**: Read-only mode with editor canvas locked (`editable: false`), formatting toolbar disabled, and dedicated blue view-only banner.
- **UI Segregation**: Dashboard displays clean tabs for **"My Documents"** (owned) and **"Shared with me"** (collaborative) with respective count badges.
- **Strict Backend Enforcement**:
  - Attempting to view an unshared document returns **403 Forbidden** (`{ error: "Access denied..." }`).
  - Attempting to edit as a viewer returns **403 Forbidden** (`{ error: "View-only access..." }`).
  - Attempting to delete as non-owner returns **403 Forbidden**.
- **User-Friendly 403 Screen**: Frontend catches 403 responses and renders a clean "403 Access Denied" card with a 1-click button to return to authorized documents.
- **1-Click User Switcher**:
  - Seeded Personas:
    1. **Alice Chen** (`usr_alice`) — Product Lead
    2. **Bob Martinez** (`usr_bob`) — Staff Engineer
    3. **Charlie Kim** (`usr_charlie`) — Growth Designer (unshared outsider by default)
  - Dropdown in navbar lets reviewers switch personas instantly without login barriers.

### 2.4 Persistence & Reliability
- SQLite database (`./data/ajaia_docs.db`) using WAL mode and foreign key cascades.
- Pre-seeded sample documents and shares automatically created on first boot if database is empty.
- URL hash routing (`#/doc/:id`) ensures that refreshing (`Cmd+R` / `F5`) preserves active document, formatting, and permissions.

### 2.5 Automated Testing
- 15 automated end-to-end integration tests using Vitest + Supertest (`npm test`):
  - Document create, read, update, delete.
  - 403 Forbidden enforcement on unshared access and edit attempts.
  - Share grants, updates, and viewer permission lockouts.
  - Owned vs Shared listing segregation.
  - File upload parsing (.md, .txt), rejection of unsupported types (.pdf), empty files, and >2MB files.

---

## 3. What Is Incomplete or Partial (Honest Audit)

1. **Simultaneous Real-Time Multi-Cursor Collaboration (CRDTs)**:
   - *Status*: Deliberately cut from initial scope per prompt guidance.
   - *Current Behavior*: Collaboration operates via persistent shared documents with debounced auto-save. If two users edit the same document concurrently, the last saved version persists.
2. **Granular File Attachments inside Document Canvas**:
   - *Status*: Per Section 2.2 ("choose ONE product-relevant behavior and implement it fully"), we chose **File Upload to Editable Document Import** over inline attachments.
3. **Password-Based Authentication / SSO**:
   - *Status*: Deliberately replaced with mocked/seeded personas + 1-click User Switcher to prioritize reviewer testing speed and zero-friction evaluation.

---

## 4. What We Would Build Next (with Another 2–4 Hours)

If allocated an additional 2–4 hours of development time, we would prioritize:

1. **Document Export & Print**:
   - Add export buttons to download documents as `.md` (Markdown), `.html`, or formatted PDF for easy sharing outside the platform.
2. **Lightweight Conflict Detection / Version Revision Timestamp**:
   - Implement optimistic concurrency checking (passing `updated_at` or version number on save). If another collaborator saved while you were typing, display a subtle non-blocking notification: *"Bob Martinez updated this document 10 seconds ago — click to view diff"*.
3. **Inline Commenting & Annotations**:
   - Allow users to highlight text and leave threaded comments (`document_comments` table with `anchor_text`, `author_id`, `body`).
4. **Recent Activity Audit Feed**:
   - Display a side drawer showing who edited the document and when (e.g., *"Alice Chen renamed to 'Q4 Engineering Goals' at 6:15 PM"*).
