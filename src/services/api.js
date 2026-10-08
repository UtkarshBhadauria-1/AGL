const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (endpoint.startsWith('/api/admin/') && !headers['x-admin-key']) {
    const key = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('agl_admin_key') : null;
    if (key) headers['x-admin-key'] = key;
  }
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error('Unable to connect to voting server. Check your connection and retry.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${response.status}).`);
  }
  return data;
}

export const api = {
  getParticipants: () => request('/api/participants'),
  getParticipant: (id) => request(`/api/participants/${encodeURIComponent(id)}`),
  addParticipant: ({ id, name }) => request('/api/admin/participants', { method: 'POST', body: JSON.stringify({ id, name }) }),
  updateParticipant: (id, { name }) => request(`/api/admin/participants/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteParticipant: (id) => request(`/api/admin/participants/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getTieBreaker: () => request('/api/admin/tie-breaker'),
  setTieBreaker: (participantIds) => request('/api/admin/tie-breaker', { method: 'POST', body: JSON.stringify({ participantIds }) }),
  getAdminConfig: () => request('/api/admin/config'),
  verifyAdminKey: (key) => request('/api/admin/verify', { method: 'POST', headers: { 'x-admin-key': key } }),
  getStatus: () => request('/api/status'),
  getResults: () => request('/api/results'),
  castVote: (participantId) => request(`/api/vote/${encodeURIComponent(participantId)}`, { method: 'POST' }),
  startVoting: () => request('/api/admin/start', { method: 'POST' }),
  stopVoting: () => request('/api/admin/stop', { method: 'POST' }),
  resetVotes: () => request('/api/admin/reset', { method: 'POST' }),
};
