import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = ['.md', '.markdown', '.txt'];

export default function UploadModal({ onClose, onUploadSuccess, onErrorToast }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  function validateFile(file) {
    if (!file) return false;

    // Check extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(`Unsupported file type ("${ext}"). Only Markdown (.md) and Plain Text (.txt) files are supported.`);
      setSelectedFile(null);
      return false;
    }

    // Check size limit (2MB)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`File is too large (${sizeMB} MB). Maximum allowed size is 2MB.`);
      setSelectedFile(null);
      return false;
    }

    // Check empty file
    if (file.size === 0) {
      setErrorMessage('The selected file is empty. Please select a valid document.');
      setSelectedFile(null);
      return false;
    }

    setErrorMessage('');
    return true;
  }

  function handleFileSelection(file) {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage('');

    try {
      await onUploadSuccess(selectedFile);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Import Document</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Convert an external file into a formatted Ajaia document
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* File Spec Notice Banner */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '18px',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)'
          }}>
            <div><strong>Supported file types:</strong> <code>.md</code>, <code>.markdown</code>, <code>.txt</code></div>
            <div><strong>Maximum file size:</strong> <code>2 MB</code></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Markdown headers, bolding, lists, and quotes will be parsed into rich text automatically.
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`upload-dropzone ${dragActive ? 'dragging' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <UploadCloud className="upload-icon" />
            <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
              Drag and drop your file here, or click to browse
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Supports .md and .txt up to 2MB
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selected File Summary */}
          {selectedFile && !errorMessage && (
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <CheckCircle2 size={18} color="var(--success)" />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Importing...' : 'Import Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
