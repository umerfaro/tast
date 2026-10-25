import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, getActiveUserId, setActiveUserId } from './api';
import Navbar from './components/Navbar';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';
import ShareModal from './components/ShareModal';
import UploadModal from './components/UploadModal';
import Toast from './components/Toast';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUser] = useState(getActiveUserId());
  const [ownedDocs, setOwnedDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Document State
  const [currentDoc, setCurrentDoc] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [accessState, setAccessState] = useState({
    access: 'owner',
    canEdit: true,
    canShare: true,
    canDelete: true,
    shares: []
  });
  const [accessDeniedError, setAccessDeniedError] = useState(null);

  // Save State: 'saved' | 'saving' | 'unsaved' | 'error'
  const [saveStatus, setSaveStatus] = useState('saved');

  // Modals
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Auto-save debounce timer ref
  const saveTimeoutRef = useRef(null);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Load users list
  useEffect(() => {
    api.getUsers()
      .then((res) => {
        if (res.users) setUsers(res.users);
      })
      .catch((err) => {
        console.error('Failed to load users:', err);
      });
  }, []);

  // 2. Fetch document lists for current user
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getDocuments();
      setOwnedDocs(res.owned || []);
      setSharedDocs(res.shared || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      addToast(err.message || 'Failed to fetch documents', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Load documents when active user changes
  useEffect(() => {
    loadDocuments();
  }, [activeUserId, loadDocuments]);

  // 3. Open Document by ID
  const openDocument = useCallback(async (docId) => {
    try {
      setAccessDeniedError(null);
      setSaveStatus('saved');
      const res = await api.getDocument(docId);
      setCurrentDoc(res.document);
      setDocTitle(res.document.title);
      setDocContent(res.document.content);
      setAccessState({
        access: res.access,
        canEdit: res.canEdit,
        canShare: res.canShare,
        canDelete: res.canDelete,
        shares: res.shares || []
      });
      window.location.hash = `#/doc/${docId}`;
    } catch (err) {
      console.error('Error loading document:', err);
      if (err.status === 403) {
        setAccessDeniedError(err.message || 'Access denied. You do not have permission to view this document.');
      } else {
        addToast(err.message || 'Failed to open document', 'error');
        window.location.hash = '';
      }
    }
  }, [addToast]);

  // 4. Handle Hash URL on initial page mount & popstate (refresh survival)
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash;
      if (hash.startsWith('#/doc/')) {
        const docId = hash.replace('#/doc/', '');
        if (docId) {
          openDocument(docId);
        }
      } else {
        setCurrentDoc(null);
        setAccessDeniedError(null);
      }
    }

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [openDocument]);

  // 5. Handle switching persona
  const handleUserChange = (newUserId) => {
    setActiveUserId(newUserId);
    setActiveUser(newUserId);
    const selectedUser = users.find(u => u.id === newUserId);
    addToast(`Switched persona to ${selectedUser?.name || newUserId}`, 'info');

    // If currently inside a document, reload with new user permissions
    const hash = window.location.hash;
    if (hash.startsWith('#/doc/')) {
      const docId = hash.replace('#/doc/', '');
      openDocument(docId);
    }
  };

  // 6. Save document (debounced auto-save or manual)
  const saveDocument = useCallback(async (titleOverride, contentOverride) => {
    if (!currentDoc || !accessState.canEdit) return;

    const titleToSave = titleOverride !== undefined ? titleOverride : docTitle;
    const contentToSave = contentOverride !== undefined ? contentOverride : docContent;

    try {
      setSaveStatus('saving');
      const res = await api.updateDocument(currentDoc.id, {
        title: titleToSave,
        content: contentToSave
      });
      setCurrentDoc(res.document);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      addToast(err.message || 'Failed to save changes', 'error');
    }
  }, [currentDoc, accessState.canEdit, docTitle, docContent, addToast]);

  // Trigger debounced auto-save when content changes
  const handleContentChange = (newHtml) => {
    setDocContent(newHtml);
    if (!accessState.canEdit) return;

    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDocument(docTitle, newHtml);
    }, 1500);
  };

  // Handle title rename
  const handleTitleChange = (newTitle) => {
    setDocTitle(newTitle);
    if (!accessState.canEdit) return;

    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDocument(newTitle, docContent);
    }, 1000);
  };

  // 7. Create New Document
  const handleCreateDocument = async () => {
    try {
      const res = await api.createDocument({
        title: 'Untitled Document',
        content: '<p></p>'
      });
      addToast('Created new document', 'success');
      loadDocuments();
      openDocument(res.document.id);
    } catch (err) {
      addToast(err.message || 'Failed to create document', 'error');
    }
  };

  // 8. Delete Document
  const handleDeleteDocument = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      addToast('Document deleted', 'info');
      loadDocuments();
      if (currentDoc && currentDoc.id === docId) {
        window.location.hash = '';
        setCurrentDoc(null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete document', 'error');
    }
  };

  // 9. Share / Permissions
  const handleShare = async (docId, { userId, permission }) => {
    try {
      const res = await api.shareDocument(docId, { userId, permission });
      setAccessState((prev) => ({
        ...prev,
        shares: res.shares || []
      }));
      addToast(res.message || 'Permissions updated', 'success');
      loadDocuments();
    } catch (err) {
      addToast(err.message || 'Failed to update sharing', 'error');
      throw err;
    }
  };

  const handleRevokeShare = async (docId, targetUserId) => {
    try {
      const res = await api.revokeShare(docId, targetUserId);
      setAccessState((prev) => ({
        ...prev,
        shares: res.shares || []
      }));
      addToast('Revoked user access', 'info');
      loadDocuments();
    } catch (err) {
      addToast(err.message || 'Failed to revoke access', 'error');
    }
  };

  // 10. File Upload / Import (.md / .txt)
  const handleUploadSuccess = async (file) => {
    try {
      const res = await api.uploadDocument(file);
      addToast(res.message || 'File imported successfully!', 'success');
      loadDocuments();
      openDocument(res.document.id);
    } catch (err) {
      addToast(err.message || 'File import failed', 'error');
      throw err;
    }
  };

  // Return to documents dashboard
  const handleBackToDashboard = () => {
    window.location.hash = '';
    setCurrentDoc(null);
    setAccessDeniedError(null);
    loadDocuments();
  };

  return (
    <div className="app-container">
      <Navbar
        currentDoc={currentDoc}
        docTitle={docTitle}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        onSave={() => saveDocument()}
        onBack={handleBackToDashboard}
        onOpenShare={() => setIsShareOpen(true)}
        users={users}
        activeUserId={activeUserId}
        onUserChange={handleUserChange}
        canEdit={accessState.canEdit}
        canShare={accessState.canShare}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Case 1: 403 Forbidden Access Denied */}
        {accessDeniedError ? (
          <div className="access-denied-view">
            <ShieldAlert className="access-denied-icon" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#991b1b' }}>
              403: Access Denied
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
              {accessDeniedError}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBackToDashboard}
              >
                <ArrowLeft size={16} />
                <span>Return to Documents</span>
              </button>
            </div>
          </div>
        ) : currentDoc ? (
          /* Case 2: Document Editor View */
          <DocumentEditor
            documentData={currentDoc}
            canEdit={accessState.canEdit}
            onContentChange={handleContentChange}
            onManualSave={() => saveDocument()}
          />
        ) : (
          /* Case 3: Document List Dashboard */
          <DocumentList
            ownedDocs={ownedDocs}
            sharedDocs={sharedDocs}
            onSelectDoc={openDocument}
            onCreateDoc={handleCreateDocument}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenShare={(doc) => {
              setCurrentDoc(doc);
              openDocument(doc.id).then(() => setIsShareOpen(true));
            }}
            onDeleteDoc={handleDeleteDocument}
            activeUserId={activeUserId}
          />
        )}
      </main>

      {/* Share Modal */}
      {isShareOpen && (
        <ShareModal
          documentData={{ document: currentDoc, shares: accessState.shares }}
          users={users}
          activeUserId={activeUserId}
          onClose={() => setIsShareOpen(false)}
          onShare={handleShare}
          onRevokeShare={handleRevokeShare}
        />
      )}

      {/* Upload File Modal */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={handleUploadSuccess}
          onErrorToast={(msg) => addToast(msg, 'error')}
        />
      )}

      {/* Feedback Toasts */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
