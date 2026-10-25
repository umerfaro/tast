import React from 'react';
import { FileText, ArrowLeft, Share2, Save, CloudCheck, AlertCircle, RefreshCw } from 'lucide-react';
import UserSwitcher from './UserSwitcher';

export default function Navbar({
  currentDoc,
  docTitle,
  onTitleChange,
  saveStatus,
  onSave,
  onBack,
  onOpenShare,
  users,
  activeUserId,
  onUserChange,
  canEdit,
  canShare
}) {
  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="brand-badge" onClick={onBack} title="Ajaia Workspace">
          <div className="brand-logo-icon">
            <FileText size={18} />
          </div>
          <span>Ajaia</span>
          <span className="brand-tag">Docs</span>
        </div>

        {currentDoc && (
          <>
            <button
              type="button"
              className="btn btn-ghost-nav btn-sm"
              onClick={onBack}
              title="Return to Documents Dashboard"
            >
              <ArrowLeft size={16} />
              <span>All Docs</span>
            </button>

            <input
              type="text"
              className="doc-title-input"
              value={docTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled Document"
              disabled={!canEdit}
              title={canEdit ? 'Click to rename document' : 'View only - renaming disabled'}
            />

            {/* Save Status Pill */}
            <div className="save-status-pill">
              {saveStatus === 'saved' && (
                <>
                  <span className="status-dot saved" />
                  <span>Saved</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <span className="status-dot saving" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <span className="status-dot unsaved" />
                  <span>Unsaved changes</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <span className="status-dot error" />
                  <span>Save failed</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="nav-right">
        {currentDoc && (
          <>
            {canShare && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onOpenShare}
                title="Share document with team members"
              >
                <Share2 size={15} />
                <span>Share</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onSave}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                title="Save document changes"
              >
                <Save size={15} />
                <span>Save</span>
              </button>
            )}
          </>
        )}

        <UserSwitcher
          users={users}
          activeUserId={activeUserId}
          onUserChange={onUserChange}
        />
      </div>
    </header>
  );
}
