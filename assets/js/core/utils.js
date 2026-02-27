/* global Utils */
const Utils = (() => {
  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

  function generateId(prefix = 'id') {
    const rand = Array.from({ length: 10 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
    return `${prefix}_${rand}`;
  }

  function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateShort(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  function timeAgo(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'baru saja';
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    const day = Math.floor(h / 24);
    if (day < 7)  return `${day} hari lalu`;
    if (day < 30) return `${Math.floor(day / 7)} minggu lalu`;
    if (day < 365) return `${Math.floor(day / 30)} bulan lalu`;
    return `${Math.floor(day / 365)} tahun lalu`;
  }

  async function hashPassword(password) {
    try {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback for environments without crypto.subtle
      let hash = 0;
      for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }
  }

  function hashPasswordSync(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash) + password.charCodeAt(i);
      hash |= 0;
    }
    return 'sync_' + Math.abs(hash).toString(16).padStart(8, '0');
  }

  function truncate(str, max = 60) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const AVATAR_COLORS = [
    ['#3B5BDB','#EEF2FF'],['#2F9E44','#EBFBEE'],['#C92A2A','#FFF5F5'],
    ['#7048E8','#F3EEFF'],['#1971C2','#E7F5FF'],['#E67700','#FFF9DB'],
    ['#0C8599','#E3FAFC'],['#5F3DC4','#F3F0FF'],
  ];

  function getAvatarColor(userId) {
    if (!userId) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function getRoleColor(role) {
    const map = {
      admin: 'badge-admin',
      pm: 'badge-pm',
      developer: 'badge-developer',
      viewer: 'badge-viewer',
    };
    return map[role] || 'badge-viewer';
  }

  function getRoleLabel(role) {
    const map = { admin: 'Admin', pm: 'PM', developer: 'Developer', viewer: 'Viewer' };
    return map[role] || role;
  }

  function getPriorityColor(priority) {
    const map = {
      critical: 'badge-critical',
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low',
    };
    return map[priority] || 'badge-low';
  }

  function getPriorityDotClass(priority) {
    return `priority-dot ${priority}`;
  }

  function getStatusColor(status) {
    const map = {
      'todo':        'badge-todo',
      'in-progress': 'badge-in-progress',
      'review':      'badge-review',
      'done':        'badge-done',
    };
    return map[status] || 'badge-todo';
  }

  function getStatusLabel(status) {
    const map = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'review': 'In Review',
      'done': 'Done',
    };
    return map[status] || status;
  }

  function getTypeColor(type) {
    const map = { story: 'badge-story', bug: 'badge-bug', task: 'badge-task', epic: 'badge-epic' };
    return map[type] || 'badge-task';
  }

  function getTypeLabel(type) {
    const map = { story: 'Story', bug: 'Bug', task: 'Task', epic: 'Epic' };
    return map[type] || type;
  }

  function getProjectStatusLabel(status) {
    const map = { active: 'Aktif', 'on-hold': 'On Hold', completed: 'Selesai', archived: 'Arsip' };
    return map[status] || status;
  }

  function getProjectStatusColor(status) {
    const map = {
      active: 'badge-active',
      'on-hold': 'badge-on-hold',
      completed: 'badge-completed',
      archived: 'badge-archived',
    };
    return map[status] || 'badge-active';
  }

  function isOverdue(dueDateStr) {
    if (!dueDateStr) return false;
    return new Date(dueDateStr) < new Date(new Date().toDateString());
  }

  function isDueToday(dueDateStr) {
    if (!dueDateStr) return false;
    return new Date(dueDateStr).toDateString() === new Date().toDateString();
  }

  function daysUntil(dueDateStr) {
    if (!dueDateStr) return null;
    const diff = new Date(dueDateStr) - new Date(new Date().toDateString());
    return Math.ceil(diff / 86400000);
  }

  function parseQueryParams(search) {
    const params = {};
    const qs = (search || window.location.search).replace(/^\?/, '');
    if (!qs) return params;
    qs.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatHours(hours) {
    if (hours == null) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}j`;
    return `${h}j ${m}m`;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function createAvatarEl(user, size = 'md') {
    const el = document.createElement('div');
    el.className = `avatar avatar-${size}`;
    if (user.avatar) {
      const img = document.createElement('img');
      img.src = user.avatar;
      img.alt = user.name;
      el.appendChild(img);
    } else {
      const [fg, bg] = getAvatarColor(user.id);
      el.style.background = bg;
      el.style.color = fg;
      el.textContent = getInitials(user.name);
    }
    return el;
  }

  return {
    generateId,
    formatDate,
    formatDateShort,
    timeAgo,
    hashPassword,
    hashPasswordSync,
    truncate,
    debounce,
    getInitials,
    getAvatarColor,
    getRoleColor,
    getRoleLabel,
    getPriorityColor,
    getPriorityDotClass,
    getStatusColor,
    getStatusLabel,
    getTypeColor,
    getTypeLabel,
    getProjectStatusLabel,
    getProjectStatusColor,
    isOverdue,
    isDueToday,
    daysUntil,
    parseQueryParams,
    escapeHtml,
    clamp,
    formatHours,
    nowISO,
    todayISO,
    createAvatarEl,
  };
})();
