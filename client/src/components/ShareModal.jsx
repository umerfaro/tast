import React, { useState } from 'react';
import { X, UserPlus, Trash2, Copy, Check, Shield } from 'lucide-react';

export default function ShareModal({
  documentData,
  users,
  activeUserId,
  onClose,
  onShare,
  onRevokeShare
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permission, setPermission] = useState('editor');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const shares = documentData?.shares || [];
  const owner = {
    name: documentData?.document?.owner_name,
    email: documentData?.document?.owner_email,
    avatar_color: documentData?.document?.owner_avatar
  };

  // Available users that can be added (excluding owner and already shared users)
  const sharedUserIds = new Set(shares.map(s => s.user_id));
  const availableUsers = users.filter(u =>
    u.id !== documentData?.document?.owner_id && !sharedUserIds.has(u.id)
  );

  async function handleAddCollaborator(e) {
    e.preventDefault();
    if (!selectedUserId) return;
    setSubmitting(true);
    try {
      await onShare(documentData.document.id, {
        userId: selectedUserId,
        permission
      });
      setSelectedUserId('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Share Document</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {documentData?.document?.title || 'Untitled Document'}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Add Collaborator Form */}
          <form onSubmit={handleAddCollaborator} style={{ marginBottom: '24px' }}>
            <label className="form-label">Add team member</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-select"
                style={{ flex: 2 }}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={availableUsers.length === 0}
              >
                <option value="">
                  {availableUsers.length === 0
                    ? 'All seeded team members already have access'
                    : 'Select a colleague...'}
                </option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role_title}) — {u.email}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ flex: 1 }}
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedUserId || submitting}
              >
                <UserPlus size={15} />
                <span>Add</span>
              </button>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              <strong>Editor:</strong> can modify content and rename · <strong>Viewer:</strong> read-only access.
            </p>
          </form>

          {/* People with access */}
          <label className="form-label">People with access</label>
          <div className="share-list">
            {/* Owner Row */}
            <div className="share-row">
              <div className="share-user-meta">
                <span
                  className="user-avatar"
                  style={{ backgroundColor: owner.avatar_color || '#4f46e5' }}
                >
                  {(owner.name || 'A').charAt(0)}
                </span>
                <div>
                  <div className="share-user-name">
                    {owner.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(You)</span>
                  </div>
                  <div className="share-user-email">{owner.email}</div>
                </div>
              </div>
              <span className="permission-badge owner">Owner</span>
            </div>

            {/* Shares Rows */}
            {shares.map((s) => (
              <div key={s.id} className="share-row">
                <div className="share-user-meta">
                  <span
                    className="user-avatar"
                    style={{ backgroundColor: s.avatar_color || '#059669' }}
                  >
                    {s.name.charAt(0)}
                  </span>
                  <div>
                    <div className="share-user-name">{s.name}</div>
                    <div className="share-user-email">{s.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    className="form-select"
                    style={{ padding: '3px 8px', fontSize: '0.78rem', width: 'auto' }}
                    value={s.permission}
                    onChange={(e) => onShare(documentData.document.id, {
                      userId: s.user_id,
                      permission: e.target.value
                    })}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>

                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Revoke access"
                    onClick={() => onRevokeShare(documentData.document.id, s.user_id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyLink}
          >
            {copied ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
            <span>{copied ? 'Link Copied!' : 'Copy Doc Link'}</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
