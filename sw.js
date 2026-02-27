const CACHE_NAME = 'simpro-v1.0.0';
const SHELL_FILES = [
  '/index.html',
  '/404.html',
  '/manifest.json',
  '/assets/css/tokens.css',
  '/assets/css/reset.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/dashboard.css',
  '/assets/css/projects.css',
  '/assets/css/task.css',
  '/assets/css/kanban.css',
  '/assets/css/sprint.css',
  '/assets/css/polish.css',
  '/assets/css/gantt.css',
  '/assets/css/reports.css',
  '/assets/css/print.css',
  '/assets/css/io.css',
  '/assets/css/members.css',
  '/assets/css/profile.css',
  '/assets/js/core/utils.js',
  '/assets/js/core/storage.js',
  '/assets/js/core/app.js',
  '/assets/js/core/auth.js',
  '/assets/js/core/router.js',
  '/assets/js/core/shell.js',
  '/assets/js/modules/project.js',
  '/assets/js/modules/task.js',
  '/assets/js/modules/comment.js',
  '/assets/js/modules/label.js',
  '/assets/js/modules/task-modal.js',
  '/assets/js/modules/kanban.js',
  '/assets/js/modules/sprint.js',
  '/assets/js/modules/report.js',
  '/assets/js/modules/gantt.js',
  '/assets/js/modules/timelog.js',
  '/assets/js/modules/milestone.js',
  '/assets/js/modules/notification.js',
  '/assets/js/modules/io.js',
  '/assets/js/pages/login.js',
  '/assets/js/pages/register.js',
  '/assets/js/pages/dashboard.js',
  '/assets/js/pages/projects.js',
  '/assets/js/pages/project-detail.js',
  '/assets/js/pages/board.js',
  '/assets/js/pages/backlog.js',
  '/assets/js/pages/sprint.js',
  '/assets/js/pages/task-detail.js',
  '/assets/js/pages/gantt.js',
  '/assets/js/pages/reports.js',
  '/assets/js/pages/members.js',
  '/assets/js/pages/settings.js',
  '/assets/js/pages/profile.js',
  '/assets/js/pages/io.js',
  '/pages/login.html',
  '/pages/register.html',
  '/pages/dashboard.html',
  '/pages/projects.html',
  '/pages/project-detail.html',
  '/pages/board.html',
  '/pages/backlog.html',
  '/pages/sprint.html',
  '/pages/task-detail.html',
  '/pages/gantt.html',
  '/pages/reports.html',
  '/pages/members.html',
  '/pages/settings.html',
  '/pages/profile.html',
  '/pages/io.html',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
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
          if (e.request.destination === 'document') return caches.match('/index.html');
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
