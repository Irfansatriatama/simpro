const CACHE_NAME = 'simpro-v1.0.3';

// Base path diambil dari lokasi sw.js sendiri (mendukung GitHub Pages subdirectory)
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');

const SHELL_FILES = [
  `${BASE}/index.html`,
  `${BASE}/404.html`,
  `${BASE}/manifest.json`,
  `${BASE}/assets/css/tokens.css`,
  `${BASE}/assets/css/reset.css`,
  `${BASE}/assets/css/layout.css`,
  `${BASE}/assets/css/components.css`,
  `${BASE}/assets/css/dashboard.css`,
  `${BASE}/assets/css/projects.css`,
  `${BASE}/assets/css/task.css`,
  `${BASE}/assets/css/kanban.css`,
  `${BASE}/assets/css/sprint.css`,
  `${BASE}/assets/css/polish.css`,
  `${BASE}/assets/css/gantt.css`,
  `${BASE}/assets/css/reports.css`,
  `${BASE}/assets/css/print.css`,
  `${BASE}/assets/css/io.css`,
  `${BASE}/assets/css/members.css`,
  `${BASE}/assets/css/profile.css`,
  `${BASE}/assets/js/core/utils.js`,
  `${BASE}/assets/js/core/storage.js`,
  `${BASE}/assets/js/core/app.js`,
  `${BASE}/assets/js/core/auth.js`,
  `${BASE}/assets/js/core/router.js`,
  `${BASE}/assets/js/core/shell.js`,
  `${BASE}/assets/js/modules/project.js`,
  `${BASE}/assets/js/modules/task.js`,
  `${BASE}/assets/js/modules/comment.js`,
  `${BASE}/assets/js/modules/label.js`,
  `${BASE}/assets/js/modules/task-modal.js`,
  `${BASE}/assets/js/modules/kanban.js`,
  `${BASE}/assets/js/modules/sprint.js`,
  `${BASE}/assets/js/modules/report.js`,
  `${BASE}/assets/js/modules/gantt.js`,
  `${BASE}/assets/js/modules/timelog.js`,
  `${BASE}/assets/js/modules/milestone.js`,
  `${BASE}/assets/js/modules/notification.js`,
  `${BASE}/assets/js/modules/io.js`,
  `${BASE}/assets/js/pages/login.js`,
  `${BASE}/assets/js/pages/register.js`,
  `${BASE}/assets/js/pages/dashboard.js`,
  `${BASE}/assets/js/pages/projects.js`,
  `${BASE}/assets/js/pages/project-detail.js`,
  `${BASE}/assets/js/pages/board.js`,
  `${BASE}/assets/js/pages/backlog.js`,
  `${BASE}/assets/js/pages/sprint.js`,
  `${BASE}/assets/js/pages/task-detail.js`,
  `${BASE}/assets/js/pages/gantt.js`,
  `${BASE}/assets/js/pages/reports.js`,
  `${BASE}/assets/js/pages/members.js`,
  `${BASE}/assets/js/pages/settings.js`,
  `${BASE}/assets/js/pages/profile.js`,
  `${BASE}/assets/js/pages/io.js`,
  `${BASE}/pages/login.html`,
  `${BASE}/pages/register.html`,
  `${BASE}/pages/dashboard.html`,
  `${BASE}/pages/projects.html`,
  `${BASE}/pages/project-detail.html`,
  `${BASE}/pages/board.html`,
  `${BASE}/pages/backlog.html`,
  `${BASE}/pages/sprint.html`,
  `${BASE}/pages/task-detail.html`,
  `${BASE}/pages/gantt.html`,
  `${BASE}/pages/reports.html`,
  `${BASE}/pages/members.html`,
  `${BASE}/pages/settings.html`,
  `${BASE}/pages/profile.html`,
  `${BASE}/pages/io.html`,
  `${BASE}/assets/icons/icon-192.png`,
  `${BASE}/assets/icons/icon-512.png`,
];

// External CDN resources to cache on first fetch
const CDN_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com/lucide',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES.map(url => new Request(url, { cache: 'reload' }))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Cache-first for same-origin
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        }).catch(() => {
          if (e.request.destination === 'document') return caches.match(`${BASE}/index.html`);
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for CDN fonts/icons
  const isCDN = CDN_PATTERNS.some(p => url.hostname.includes(p) || url.href.includes(p));
  if (isCDN) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(response => {
            if (response && response.status === 200) cache.put(e.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
  }
});
