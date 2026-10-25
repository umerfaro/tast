# Ajaia Collaborative Document Editor — Architecture Note

## 1. Product Vision & Prioritization

Ajaia is exploring internal productivity tools that help distributed teams move faster on shared documents. Rather than attempting a sprawling, shallow clone of Google Docs, this implementation zeroes in on **core workflow reliability, permission enforcement, rich typography, and seamless document exchange**.

### What We Prioritized (and Why)
1. **End-to-End Coherence & Polish**:
   - A modern, clean workspace that feels like an enterprise internal tool (Ajaia branding, slate/indigo design tokens, document stats, auto-save states).
   - Instant visual feedback: "Saved to cloud", "Saving changes...", "Unsaved changes", or "Save failed".
2. **Rock-Solid Sharing & Access Control**:
   - Enforced **strictly at the database and API layer**, not merely via UI hiding.
   - Dual-role permission model: **Editor** (full write/rename/save) and **Viewer** (read-only mode with editor canvas locked and formatting toolbars disabled).
   - Clear UI separation between **"My Documents"** (owned) and **"Shared with Me"** (collaborative).
   - 1-click User Switcher to allow instant verification of permissions across multiple seeded personas (Alice, Bob, Charlie) without tedious multi-account logins.
3. **Structured Document Import (.md / .txt)**:
   - High-leverage upload workflow: Drag-and-drop or file upload `.md` and `.txt` files directly into newly generated editable documents.
   - Preserves semantic formatting (headings, lists, bold, italics) upon import.
   - Explicit file validation (type check and strict 2MB limit with visible error toasts).
4. **Zero-Friction Local Persistence**:
   - SQLite persistent database (`better-sqlite3`) stored on disk (`./data/ajaia_docs.db`), with auto-initialization and seed data.
   - All formatting, document metadata, and share grants survive server restarts and browser reloads.

---

## 2. Deliberate Scope Cuts (and Tradeoffs)

| Cut Feature | Rationale & Tradeoff |
| :--- | :--- |
| **Real-time simultaneous CRDTs / Operational Transforms** | Building multi-cursor conflict resolution (Yjs/Automerge) in a tight timebox risks fragile edge-case bugs and degrades baseline reliability. We chose rock-solid persistent document lifecycle with debounced auto-save and dirty-state indicators. |
| **Complex Multi-factor OAuth / Email verification** | Reviewers need to switch between personas (Alice, Bob, Charlie) in 1 click to verify access denial and shared editing. Mocked seeded authentication via persistent session switcher achieves instant reviewer ergonomics. |
| **Full Version History & Diffing** | Preserving clean rich text and sharing semantics was prioritized over tracking diff branches. Timestamps (`created_at`, `updated_at`) are captured on every document. |
| **Comment Threads & Inline Suggestions** | Secondary to core document authoring and permissions; deferred to future iterations. |

---

## 3. Data Model

The application uses a normalized relational schema in SQLite with foreign keys and cascade rules:

```sql
-- Seeded & registered users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_color TEXT NOT NULL,
  role_title TEXT NOT NULL
);

-- Core document entity
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',   -- Rich HTML / structured markup
  owner_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Explicit permission grants
CREATE TABLE document_shares (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK(permission IN ('editor', 'viewer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, user_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Entity Relationships
- **User 1 : N Document (as Owner)**
- **Document 1 : N DocumentShares (access grants)**
- **User 1 : N DocumentShares (received grants)**

---

## 4. Storage & Persistence Choice

- **Engine**: SQLite via `better-sqlite3`.
- **Location**: `./data/ajaia_docs.db` (created automatically on server boot).
- **Reasoning**:
  - Embedded, zero-configuration, cross-platform persistence.
  - ACID-compliant transactions ensure atomic share updates and document edits.
  - No external database connection strings or cloud credentials required for reviewers to execute from a clean git clone.
  - Pre-seeded on first run with sample Ajaia documents across Alice and Bob, while Charlie remains an unshared reviewer persona.

---

## 5. Authentication & Sharing Approach

### Personas Seeded
1. **Alice Chen** (`usr_alice` / `alice@ajaia.internal`) — Product Lead (Avatar: Indigo)
2. **Bob Martinez** (`usr_bob` / `bob@ajaia.internal`) — Staff Engineer (Avatar: Emerald)
3. **Charlie Kim** (`usr_charlie` / `charlie@ajaia.internal`) — Growth Designer (Avatar: Amber)

### Auth Middleware
- Client attaches the active user ID via the `x-user-id` HTTP header on all API calls.
- The server validates that `x-user-id` corresponds to a valid user in the `users` table; otherwise returns `401 Unauthorized`.
- Switching users in the UI immediately updates local storage and triggers fresh document queries matching the new persona's identity.

### Authorization & Sharing Matrix
| Request Action | Owner | Shared as 'editor' | Shared as 'viewer' | Unshared User |
| :--- | :---: | :---: | :---: | :---: |
| **GET /api/documents/:id** | 200 OK | 200 OK | 200 OK (read-only) | **403 Forbidden** |
| **PUT /api/documents/:id** | 200 OK | 200 OK | **403 Forbidden** | **403 Forbidden** |
| **POST /api/documents/:id/share** | 200 OK | **403 Forbidden** | **403 Forbidden** | **403 Forbidden** |
| **DELETE /api/documents/:id** | 200 OK | **403 Forbidden** | **403 Forbidden** | **403 Forbidden** |

---

## 6. Editor Approach

- **Editor Framework**: **TipTap** (built on top of ProseMirror).
- **Why TipTap over raw contenteditable or Quill**:
  - **ProseMirror Core**: The industry standard for structured document models (used by Notion, Linear, Google Docs architectures).
  - **Semantic Schema**: Guarantees valid HTML output without browser-specific `<div>` / `<br>` divergence.
  - **Rich Typography Support**:
    - Headings (H1, H2, H3)
    - Bold, Italic, Underline (`@tiptap/extension-underline`)
    - Bulleted lists (`<ul><li>`) and Ordered lists (`<ol><li>`)
    - Blockquotes and code blocks
  - **Native Read-Only Mode**: In viewer mode, `editable: false` locks the editor canvas, preventing DOM mutation while keeping formatting pristine.
  - **Keyboard Shortcuts**: Native support for standard keybindings (`Cmd/Ctrl+B`, `Cmd/Ctrl+I`, `Cmd/Ctrl+U`, etc.).

---

## 7. Demo Flow for Reviewers

1. **Document Creation & Rich Formatting**:
   - As **Alice**, click `+ New Document`.
   - Title it "Q4 Product Strategy".
   - Add an H1 title, a bulleted list of milestones, bold text for key metrics, and italicized notes.
   - Click `Save` (or observe auto-save indicator turn from "Saving..." to "Saved").
   - Refresh the browser (`Cmd+R` / `F5`) — formatting and title persist intact.
2. **File Upload & Markdown Import**:
   - On the document dashboard, click `Import File`.
   - Select a `.md` or `.txt` file (or drag and drop).
   - Document opens instantly with markdown parsed into rich headings and lists.
   - Try uploading an unsupported file (`.png` / `.pdf`) or file > 2MB to verify friendly error handling.
3. **Sharing with Bob as Editor**:
   - Open Alice's document, click `Share`.
   - Add **Bob Martinez** with `Editor` permission.
   - Switch active user to **Bob Martinez** via the top user switcher.
   - Navigate to the **"Shared with me"** tab — see Alice's document listed with "Editor" badge.
   - Bob opens the doc, adds a new numbered list or paragraph, and saves.
4. **Permission Enforcement on Charlie (Unshared User)**:
   - Switch active user to **Charlie Kim**.
   - Notice the document does **not** appear in Charlie's list.
   - Attempt to directly access `/doc/:id` as Charlie.
   - The UI and backend display a clean **"403 Access Denied: You do not have permission to view or edit this document"** message.
