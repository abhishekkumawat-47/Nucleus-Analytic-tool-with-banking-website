// NexaBank API Client
const API = '/api';

const api = {
  async request(method, path, data = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(API + path, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
    return json;
  },
  get: (path) => api.request('GET', path),
  post: (path, data) => api.request('POST', path, data),
  put: (path, data) => api.request('PUT', path, data),
  del: (path, data) => api.request('DELETE', path, data),
};

// Auth State
let currentUser = null;

async function checkAuth() {
  try {
    currentUser = await api.get('/auth/cookieReturn');
    return currentUser;
  } catch {
    currentUser = null;
    return null;
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}

// Format Currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// Format Date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Sidebar Active
function setActiveSidebar() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === path) link.classList.add('active');
  });
}

// Initialize User Info in Sidebar
async function initializeApp() {
  const user = await checkAuth();
  const avatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  if (user && avatar) avatar.textContent = user.id ? user.id.charAt(0).toUpperCase() : 'U';
  if (user && userName) userName.textContent = user.email || 'User';
  setActiveSidebar();

  // Hide admin nav if not admin
  const adminNav = document.getElementById('adminNav');
  if (adminNav && (!user || user.role !== 'ADMIN')) {
    adminNav.style.display = 'none';
  }
}

// Sidebar toggle for mobile
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initPage === 'function') initPage();
});
