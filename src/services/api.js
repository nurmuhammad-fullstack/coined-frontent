// src/services/api.js

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Helper to get full avatar URL
export const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  return `${BASE_URL.replace('/api', '')}${avatar}`;
};

const getHeaders = () => {
  const token = localStorage.getItem('coined_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (method, path, body = null) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ── Auth ─────────────────────────────────────────
export const authAPI = {
  login:         (email, password) => request('POST', '/auth/login', { email, password }),
  register:      (data)            => request('POST', '/auth/register', data),
  me:            ()                => request('GET',  '/auth/me'),
  createStudent: (data)            => request('POST', '/auth/create-student', data),
  updateProfile: (data)            => request('PUT',  '/auth/profile', data),
  uploadAvatar:  async (file)      => {
    const token = localStorage.getItem('coined_token');
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${BASE_URL}/auth/upload-avatar`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },
};

// ── Students ─────────────────────────────────────
export const studentsAPI = {
  getLeaderboard: ()              => request('GET',    '/students/leaderboard'),
  getAll:          ()              => request('GET',    '/students'),
  getOne:          (id)            => request('GET',    `/students/${id}`),
  deleteOne:       (id)            => request('DELETE', `/students/${id}`),
  getTransactions: (id)            => request('GET',    `/students/${id}/transactions`),
  addCoins:        (id, amount, label, category) =>
    request('POST', `/students/${id}/coins`, { amount, type: 'earn', label, category }),
  removeCoins:     (id, amount, label, category) =>
    request('POST', `/students/${id}/coins`, { amount, type: 'spend', label, category }),
};

// ── Shop ─────────────────────────────────────────
export const shopAPI = {
  getAll:    ()     => request('GET',    '/shop'),
  addItem:   (item) => request('POST',   '/shop', item),
  deleteItem:(id)   => request('DELETE', `/shop/${id}`),
  buyItem:   (id)   => request('POST',   `/shop/${id}/buy`),
};

// ── Quizzes ──────────────────────────────────────
export const quizzesAPI = {
  getAll:        ()                        => request('GET',    '/quizzes'),
  getOne:        (id)                      => request('GET',    `/quizzes/${id}`),
  create:        (data)                    => request('POST',   '/quizzes', data),
  update:        (id, data)                => request('PUT',    `/quizzes/${id}`, data),
  delete:        (id)                      => request('DELETE', `/quizzes/${id}`),
  getResults:    (id)                      => request('GET',    `/quizzes/${id}/results`),
  toggle:        (id)                      => request('PATCH',  `/quizzes/${id}/toggle`),
  submitAttempt: (id, answers, timeTaken)  => request('POST',   `/quizzes/${id}/submit`, { answers, timeTaken }),
  myAttempts:    ()                        => request('GET',    '/quizzes/my-attempts'),
};

// ── Notifications ────────────────────────────────
export const notificationsAPI = {
  getAll:         ()               => request('GET',    '/notifications'),
  getUnreadCount: ()              => request('GET',    '/notifications/unread-count'),
  markAsRead:     (id)            => request('PUT',    `/notifications/${id}/read`),
  markAllAsRead:  ()              => request('PUT',    '/notifications/read-all'),
  delete:         (id)            => request('DELETE', `/notifications/${id}`),
  clearAll:       ()              => request('DELETE', '/notifications/clear-all'),
};
