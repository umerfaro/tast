// API client for Ajaia Document Editor

const STORAGE_KEY = 'ajaia_active_user_id';

export function getActiveUserId() {
  return localStorage.getItem(STORAGE_KEY) || 'usr_alice';
}

export function setActiveUserId(userId) {
  localStorage.setItem(STORAGE_KEY, userId);
}

async function request(path, options = {}) {
  const userId = getActiveUserId();
  const headers = {
    'x-user-id': userId,
    ...(options.headers || {})
  };

  // Only set application/json if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = (data && data.error) ? data.error : `Request failed with status ${res.status}`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Users
  getUsers: () => request('/api/users'),
  getMe: () => request('/api/users/me'),

  // Documents
  getDocuments: () => request('/api/documents'),
  getDocument: (id) => request(`/api/documents/${id}`),
  createDocument: (data) => request('/api/documents', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateDocument: (id, data) => request(`/api/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteDocument: (id) => request(`/api/documents/${id}`, {
    method: 'DELETE'
  }),

  // Sharing
  shareDocument: (docId, { userId, email, permission }) => request(`/api/documents/${docId}/share`, {
    method: 'POST',
    body: JSON.stringify({ userId, email, permission })
  }),
  revokeShare: (docId, targetUserId) => request(`/api/documents/${docId}/share/${targetUserId}`, {
    method: 'DELETE'
  }),

  // File Upload (.md / .txt to document)
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/documents/upload', {
      method: 'POST',
      body: formData
    });
  }
};
