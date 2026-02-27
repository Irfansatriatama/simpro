/* global App, Storage, Utils */
const App = (() => {
  // ── Event Bus ──
  const _listeners = {};

  const events = {
    on(event, handler) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(handler);
    },
    off(event, handler) {
      if (!_listeners[event]) return;
      _listeners[event] = _listeners[event].filter(h => h !== handler);
    },
    emit(event, data) {
      (_listeners[event] || []).forEach(h => h(data));
    },
  };

  // ── Toast API ──
  const Toast = (() => {
    function _getContainer() {
      let c = document.getElementById('toast-container');
      if (!c) {
        c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
      }
      return c;
    }

    function _iconSvg(type) {
      const icons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      };
      return icons[type] || icons.info;
    }

    function show(options) {
      const { type = 'info', title, message, duration = 3000 } = 
        (typeof options === 'string') ? { title: options } : options;

      const container = _getContainer();
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <div class="toast-icon">${_iconSvg(type)}</div>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${Utils.escapeHtml(title)}</div>` : ''}
          ${message ? `<div class="toast-message">${Utils.escapeHtml(message)}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Tutup">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>`;

      container.appendChild(toast);

      const remove = () => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
      };

      toast.querySelector('.toast-close').addEventListener('click', remove);
      if (duration > 0) setTimeout(remove, duration);

      return { remove };
    }

    return {
      success: (title, message) => show({ type: 'success', title, message }),
      error:   (title, message) => show({ type: 'error',   title, message }),
      warning: (title, message) => show({ type: 'warning', title, message }),
      info:    (title, message) => show({ type: 'info',    title, message }),
      show,
    };
  })();

  // ── Theme ──
  function _getTheme() {
    return localStorage.getItem('sp_theme') || 'light';
  }

  function _applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('sp_theme', theme);
  }

  function toggleTheme() {
    const next = _getTheme() === 'dark' ? 'light' : 'dark';
    _applyTheme(next);
    events.emit('theme:changed', next);
    _updateThemeToggleUI(next);
  }

  function _updateThemeToggleUI(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const icon = theme === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
    btn.innerHTML = icon;
    btn.setAttribute('data-tooltip', theme === 'dark' ? 'Mode Terang' : 'Mode Gelap');
  }

  // ── Sidebar ──
  function _initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger');
    if (!sidebar) return;

    function openSidebar() {
      sidebar.classList.add('open');
      overlay && overlay.classList.add('visible');
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay && overlay.classList.remove('visible');
    }

    hamburger && hamburger.addEventListener('click', openSidebar);
    overlay && overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSidebar();
    });

    // Active nav item
    const currentPage = document.body.getAttribute('data-page') || '';
    document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
      if (item.getAttribute('data-page') === currentPage) {
        item.classList.add('active');
      }
    });
  }

  // ── Dropdown ──
  function _initDropdownCloser() {
    document.addEventListener('click', e => {
      document.querySelectorAll('.dropdown-menu:not([data-persistent])').forEach(menu => {
        const toggle = menu.previousElementSibling;
        if (!menu.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
          menu.classList.add('hidden');
        }
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.dropdown-menu:not([data-persistent])').forEach(m => m.classList.add('hidden'));
      }
    });
  }

  // ── Modal ──
  function _trapFocus(modalEl) {
    const focusable = modalEl.querySelectorAll(
      'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    const handler = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    modalEl.addEventListener('keydown', handler);
    modalEl._focusTrapHandler = handler;
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('hidden');
    modalEl.setAttribute('aria-hidden', 'false');
    const firstInput = modalEl.querySelector('input, textarea, select, button');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
    _trapFocus(modalEl);

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        closeModal(modalEl);
        document.removeEventListener('keydown', handleKey);
      }
    };
    document.addEventListener('keydown', handleKey);
    modalEl._escHandler = handleKey;
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    modalEl.setAttribute('aria-hidden', 'true');
    if (modalEl._escHandler) {
      document.removeEventListener('keydown', modalEl._escHandler);
    }
  }

  function createModal({ title, body, footer, size = '' }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">${Utils.escapeHtml(title)}</h2>
          <button class="modal-close" aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>`;

    const close = () => {
      overlay.classList.add('hidden');
      overlay.remove();
    };

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    });

    document.body.appendChild(overlay);
    _trapFocus(overlay);
    const firstInput = overlay.querySelector('input, textarea, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);

    // Enter key submits the primary action button (unless in textarea)
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
        const primaryBtn = overlay.querySelector('.modal-footer .btn-primary');
        if (primaryBtn) { e.preventDefault(); primaryBtn.click(); }
      }
    });

    return { overlay, close };
  }

  // ── Lucide icons init ──
  function _initIcons() {
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // ── Global Error Boundary ──
  function _initErrorBoundary() {
    window.addEventListener('error', (e) => {
      console.error('SIMPRO error:', e.error);
      // Avoid toast spam for same error
      const msg = e.error ? (e.error.message || 'Kesalahan tidak diketahui') : 'Kesalahan halaman';
      if (!window._lastErrorMsg || window._lastErrorMsg !== msg) {
        window._lastErrorMsg = msg;
        Toast.error('Terjadi kesalahan', 'Coba refresh halaman jika masalah berlanjut');
        setTimeout(() => { window._lastErrorMsg = null; }, 5000);
      }
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('SIMPRO unhandled promise:', e.reason);
    });
  }

  // ── PWA & Offline ──
  function _initPWA() {
    // Offline/online banner
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.textContent = '⚡ Anda sedang offline — data diambil dari cache lokal';
    document.body.prepend(banner);

    function updateOnlineStatus() {
      if (!navigator.onLine) {
        banner.classList.add('visible');
        document.body.classList.add('offline');
      } else {
        banner.classList.remove('visible');
        document.body.classList.remove('offline');
      }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // PWA Install prompt
    let _deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _deferredPrompt = e;

      if (localStorage.getItem('sp_pwa_dismissed')) return;

      const installBanner = document.createElement('div');
      installBanner.id = 'pwa-install-banner';
      installBanner.setAttribute('role', 'complementary');
      installBanner.setAttribute('aria-label', 'Pasang aplikasi SIMPRO');
      installBanner.innerHTML = `
        <div class="pwa-banner-icon" aria-hidden="true">S</div>
        <div class="pwa-banner-text">
          <div class="pwa-banner-title">Pasang SIMPRO</div>
          <div class="pwa-banner-desc">Akses lebih cepat, bisa offline</div>
        </div>
        <div class="pwa-banner-actions">
          <button class="btn btn-ghost btn-sm" id="pwa-dismiss" aria-label="Abaikan">Nanti</button>
          <button class="btn btn-primary btn-sm" id="pwa-install" aria-label="Pasang aplikasi">Pasang</button>
        </div>`;
      document.body.appendChild(installBanner);

      document.getElementById('pwa-install').addEventListener('click', async () => {
        if (!_deferredPrompt) return;
        _deferredPrompt.prompt();
        const { outcome } = await _deferredPrompt.userChoice;
        _deferredPrompt = null;
        installBanner.remove();
        if (outcome === 'accepted') Toast.success('SIMPRO terpasang!');
      });

      document.getElementById('pwa-dismiss').addEventListener('click', () => {
        localStorage.setItem('sp_pwa_dismissed', '1');
        installBanner.remove();
      });
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('../sw.js').catch(() => {});
    }
  }

  // ── Keyboard UX ──
  function _initKeyboardUX() {
    // Add keyboard class so we can show focus rings
    let usingMouse = false;
    document.addEventListener('mousedown', () => { usingMouse = true; });
    document.addEventListener('keydown', (e) => {
      if (!usingMouse) document.body.classList.add('using-keyboard');
      usingMouse = false;

      // Global Esc: close any open modal or dropdown
      if (e.key === 'Escape') {
        const openDropdown = document.querySelector('.dropdown-menu:not(.hidden)');
        if (openDropdown) {
          openDropdown.classList.add('hidden');
          e.stopPropagation();
        }
      }
    });
  }

  // ── Main init ──
  async function init(pageId) {
    document.body.setAttribute('data-page', pageId || '');

    // Apply saved theme
    _applyTheme(_getTheme());

    // Seed data if needed
    await Storage.seed();

    // Init UI
    _initSidebar();
    _initDropdownCloser();
    _initIcons();

    // Theme toggle button
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      _updateThemeToggleUI(_getTheme());
      themeBtn.addEventListener('click', toggleTheme);
    }

    // Populate sidebar user info
    _populateSidebarUser();

    // Notification badge
    _updateNotifBadge();

    // Error boundary
    _initErrorBoundary();

    // PWA + offline + keyboard UX
    _initPWA();
    _initKeyboardUX();

    return true;
  }

  function _populateSidebarUser() {
    // Handled by Shell.js — kept as no-op for backward compatibility
  }

  function _updateNotifBadge() {
    const session = Storage.get('sp_session');
    if (!session) return;
    const notifs = Storage.query('sp_notifications', n => n.userId === session.userId && !n.isRead);
    const badge = document.getElementById('notif-count');
    if (!badge) return;
    if (notifs.length > 0) {
      badge.textContent = notifs.length > 9 ? '9+' : notifs.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function refreshNotifBadge() {
    _updateNotifBadge();
  }

  return { init, events, Toast, toggleTheme, openModal, closeModal, createModal, refreshNotifBadge };
})();
