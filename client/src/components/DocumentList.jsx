import React, { useState } from 'react';
import { Plus, Upload, FileText, Share2, Trash2, Search, Clock, User, ShieldCheck } from 'lucide-react';

export default function DocumentList({
  ownedDocs,
  sharedDocs,
  onSelectDoc,
  onCreateDoc,
  onOpenUpload,
  onOpenShare,
  onDeleteDoc,
  activeUserId
}) {
  const [activeTab, setActiveTab] = useState('owned'); // 'owned' | 'shared'
  const [searchQuery, setSearchQuery] = useState('');

  const currentDocs = activeTab === 'owned' ? ownedDocs : sharedDocs;

  const filteredDocs = currentDocs.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1>Shared Documents</h1>
          <p className="dashboard-subtitle">
            Collaborative knowledge base for Ajaia internal teams
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenUpload}
            title="Import a .md or .txt file as a new document"
          >
            <Upload size={16} />
            <span>Import File (.md / .txt)</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onCreateDoc}
            title="Create a new blank rich-text document"
          >
            <Plus size={16} />
            <span>New Document</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'owned' ? 'active' : ''}`}
          onClick={() => setActiveTab('owned')}
        >
          <span>My Documents</span>
          <span className="tab-badge">{ownedDocs.length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'shared' ? 'active' : ''}`}
          onClick={() => setActiveTab('shared')}
        >
          <span>Shared with me</span>
          <span className="tab-badge">{sharedDocs.length}</span>
        </button>
      </div>

      {/* Search Bar if documents exist */}
      {(ownedDocs.length > 0 || sharedDocs.length > 0) && (
        <div style={{ marginBottom: '20px', maxWidth: '360px', position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder={`Filter ${activeTab === 'owned' ? 'my documents' : 'shared documents'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Document Grid */}
      {filteredDocs.length > 0 ? (
        <div className="document-grid">
          {filteredDocs.map((doc) => {
            const isOwner = activeTab === 'owned' || doc.owner_id === activeUserId;
            return (
              <div
                key={doc.id}
                className="document-card"
                onClick={() => onSelectDoc(doc.id)}
              >
                <div className="doc-card-top">
                  <h3 className="doc-card-title">{doc.title}</h3>
                  <span className={`permission-badge ${doc.permission || 'owner'}`}>
                    {doc.permission || 'owner'}
                  </span>
                </div>

                <div className="doc-card-meta">
                  <div className="doc-card-user" title={`Owner: ${doc.owner_name} (${doc.owner_email})`}>
                    <span
                      className="user-avatar"
                      style={{
                        backgroundColor: doc.owner_avatar || 'var(--primary)',
                        width: '20px',
                        height: '20px',
                        fontSize: '0.65rem'
                      }}
                    >
                      {(doc.owner_name || 'U').charAt(0)}
                    </span>
                    <span>{doc.owner_name || 'Unknown'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem' }}>
                      {formatDate(doc.updated_at)}
                    </span>

                    <div className="doc-card-actions" onClick={(e) => e.stopPropagation()}>
                      {isOwner && (
                        <>
                          <button
                            type="button"
                            className="icon-btn"
                            title="Share document"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenShare(doc);
                            }}
                          >
                            <Share2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Delete document"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDoc(doc.id, doc.title);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          {activeTab === 'owned' ? (
            <>
              <h3>No documents created yet</h3>
              <p>
                Get started by creating your first document or importing an existing markdown / text file.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onCreateDoc}
              >
                <Plus size={16} />
                <span>Create Document</span>
              </button>
            </>
          ) : (
            <>
              <h3>No documents shared with you</h3>
              <p>
                When colleagues share documents with your account, they will appear right here with your assigned permissions.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
