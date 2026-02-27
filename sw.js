const CACHE_NAME = 'simpro-v0.7.0';
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
  '/assets/js/pages/board.js',
  '/assets/js/pages/backlog.js',
  '/pages/backlog.html',
  '/assets/js/pages/projects.js',
  '/assets/js/pages/project-detail.js',
  '/assets/js/pages/task-detail.js',
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
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES.map(url => new Request(url, { cache: 'reload' }))))
      .catch(() => {}) // Dont fail install if some files are missing yet
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
  // Only handle GET requests for same-origin
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('/404.html');
        }
      });
    })
  );
});
