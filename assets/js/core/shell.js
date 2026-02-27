/* SIMPRO — Shell: sidebar + topbar HTML builder
 * Digunakan oleh semua halaman authenticated.
 * Shell.render(pageId, pageTitle) → inject sidebar + topbar ke DOM,
 * lalu dipanggil sebelum App.init() di setiap halaman.
 */
const Shell = (() => {
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard',    icon: 'layout-dashboard', href: './dashboard.html',     section: 'main' },
    { id: 'projects',  label: 'Projects',     icon: 'folder',           href: './projects.html',      section: 'main' },
    { id: 'board',     label: 'Board',        icon: 'kanban',           href: './board.html',         section: 'work', sectionLabel: 'Kerja' },
    { id: 'backlog',   label: 'Backlog',      icon: 'list',             href: './backlog.html',       section: 'work' },
    { id: 'sprint',    label: 'Sprint',       icon: 'zap',              href: './sprint.html',        section: 'work' },
    { id: 'gantt',     label: 'Gantt',        icon: 'gantt-chart',      href: './gantt.html',         section: 'work' },
    { id: 'reports',   label: 'Laporan',      icon: 'bar-chart-2',      href: './reports.html',       section: 'report', sectionLabel: 'Laporan' },
    { id: 'members',   label: 'Member',       icon: 'users',            href: './members.html',       section: 'admin', sectionLabel: 'Admin' },
    { id: 'settings',  label: 'Settings',     icon: 'settings',         href: './settings.html',      section: 'admin' },
    { id: 'io',        label: 'Import/Export',icon: 'arrow-left-right', href: './io.html',            section: 'admin' },
  ];

  function _buildNavHTML(activePageId) {
    const sections = {};
    NAV_ITEMS.forEach(item => {
      if (!sections[item.section]) sections[item.section] = { label: item.sectionLabel || null, items: [] };
      sections[item.section].items.push(item);
    });

    let html = '';
    Object.values(sections).forEach((sec, idx) => {
      if (idx > 0) html += '<div class="sidebar-divider"></div>';
      html += '<div class="sidebar-section">';
      if (sec.label) html += `<div class="sidebar-section-label">${sec.label}</div>`;
      sec.items.forEach(item => {
        const active = item.id === activePageId ? ' active' : '';
        html += `
          <a class="sidebar-item${active}" data-page="${item.id}" href="${item.href}">
            <span class="sidebar-item-icon"><i data-lucide="${item.icon}"></i></span>
            ${item.label}
          </a>`;
      });
      html += '</div>';
    });
    return html;
  }

  function _buildSidebarHTML(pageId) {
    return `
    <div class="sidebar-logo">
      <div class="sidebar-logo-mark">S</div>
      <div>
        <span class="sidebar-logo-text">SIMPRO</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${_buildNavHTML(pageId)}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user-btn" style="cursor:pointer;">
        <div id="sidebar-user-avatar" class="avatar avatar-sm" style="background:var(--color-accent-light);color:var(--color-accent);">?</div>
        <div class="sidebar-user-info">
          <div id="sidebar-user-name" class="sidebar-user-name">—</div>
          <div id="sidebar-user-role" class="sidebar-user-role">—</div>
        </div>
        <button class="sidebar-logout-btn" id="sidebar-logout" aria-label="Logout" data-tooltip="Logout">
          <i data-lucide="log-out"></i>
        </button>
      </div>
    </div>`;
  }

  function _buildTopbarHTML(pageTitle) {
    return `
    <button id="hamburger" class="hamburger" aria-label="Toggle sidebar">
      <i data-lucide="menu"></i>
    </button>
    <span class="topbar-title" id="topbar-title">${pageTitle || ''}</span>
    <div class="topbar-actions">
      <button id="theme-toggle" class="topbar-btn" aria-label="Toggle theme" data-tooltip="Mode Gelap">
        <i data-lucide="moon"></i>
      </button>
      <div class="notif-wrapper" style="position:relative;">
        <button class="topbar-btn" id="notif-btn" aria-label="Notifikasi" data-tooltip="Notifikasi" style="position:relative;">
          <i data-lucide="bell"></i>
          <span id="notif-count" class="topbar-notif-count hidden">0</span>
        </button>
        <div id="notif-dropdown" class="dropdown-menu notif-dropdown hidden">
          <div class="notif-header">
            <span class="notif-header-title">Notifikasi</span>
            <div style="display:flex;gap:4px;">
              <button id="notif-mark-all" class="btn btn-ghost btn-sm">Baca semua</button>
              <button id="notif-clear-all" class="btn btn-ghost btn-sm" style="color:var(--color-text-3)">Hapus semua</button>
            </div>
          </div>
          <div id="notif-list" class="notif-list"></div>
        </div>
      </div>
      <div class="avatar-dropdown-wrap" style="position:relative;">
        <button class="topbar-avatar-btn" id="topbar-avatar-btn" aria-label="Menu profil">
          <div id="topbar-avatar" class="avatar avatar-sm" style="background:var(--color-accent-light);color:var(--color-accent);">?</div>
        </button>
        <div id="avatar-dropdown" class="dropdown-menu hidden" style="right:0;min-width:180px;">
          <div class="dropdown-user-info" id="dropdown-user-info">
            <div id="dropdown-user-name" class="dropdown-user-name">—</div>
            <div id="dropdown-user-email" class="dropdown-user-email">—</div>
          </div>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="./profile.html">
            <i data-lucide="user"></i> Profil Saya
          </a>
          <a class="dropdown-item" href="./settings.html">
            <i data-lucide="settings"></i> Settings
          </a>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item dropdown-item-danger" id="topbar-logout-btn">
            <i data-lucide="log-out"></i> Logout
          </button>
        </div>
      </div>
    </div>`;
  }

  function _injectStyles() {
    if (document.getElementById('shell-extra-styles')) return;
    const style = document.createElement('style');
    style.id = 'shell-extra-styles';
    style.textContent = `
      .topbar-notif-count { position:absolute;top:4px;right:4px;min-width:16px;height:16px;background:var(--color-danger);color:#fff;font-size:10px;font-weight:600;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;pointer-events:none; }
      .topbar-avatar-btn { background:none;border:none;cursor:pointer;padding:0;border-radius:50%;display:flex; }
      .notif-dropdown { width:340px;max-height:420px;overflow-y:auto;padding:0; }
      .notif-header { display:flex;align-items:center;justify-content:space-between;padding:var(--sp-3) var(--sp-4);border-bottom:1px solid var(--color-border);position:sticky;top:0;background:var(--color-surface);z-index:1; }
      .notif-header-title { font-size:var(--text-sm);font-weight:600;color:var(--color-text); }
      .notif-list { padding:var(--sp-2) 0; }
      /* Fix: topbar dropdowns menggunakan position:fixed agar tidak terpotong overflow parent */
      #notif-dropdown, #avatar-dropdown { position:fixed !important; top:auto !important; left:auto !important; z-index:1600 !important; }
      .notif-item { display:flex;align-items:flex-start;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);cursor:pointer;transition:background var(--transition);border-left:3px solid transparent; }
      .notif-item:hover { background:var(--color-surface-2); }
      .notif-item.unread { background:var(--color-accent-light);border-left-color:var(--color-accent); }
      .notif-item.unread:hover { background:var(--color-accent-light); filter:brightness(0.97); }
      .notif-item-dot { width:8px;height:8px;border-radius:50%;background:var(--color-accent);flex-shrink:0;margin-top:5px; }
      .notif-item-dot.read { background:transparent; }
      .notif-item-body { flex:1;min-width:0; }
      .notif-item-title { font-size:var(--text-sm);font-weight:500;color:var(--color-text);margin-bottom:2px; }
      .notif-item-msg { font-size:var(--text-xs);color:var(--color-text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .notif-item-time { font-size:10px;color:var(--color-text-3);margin-top:2px; }
      .notif-empty { padding:var(--sp-8) var(--sp-4);text-align:center;color:var(--color-text-3);font-size:var(--text-sm); }
      .dropdown-user-info { padding:var(--sp-3) var(--sp-4); }
      .dropdown-user-name { font-size:var(--text-sm);font-weight:600;color:var(--color-text); }
      .dropdown-user-email { font-size:var(--text-xs);color:var(--color-text-3);margin-top:1px; }
      .dropdown-item-danger { color:var(--color-danger) !important; }
      .dropdown-item-danger:hover { background:var(--color-danger-bg) !important; }
      .sidebar-item { text-decoration:none;color:inherit;display:flex;align-items:center;gap:var(--sp-3); }
      .avatar-dropdown-wrap { position:relative; }
      .notif-wrapper { position:relative; }
    `;
    document.head.appendChild(style);
  }

  function _setupNotifDropdown() {
    const notifBtn      = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    const markAllBtn    = document.getElementById('notif-mark-all');
    const notifList     = document.getElementById('notif-list');
    if (!notifBtn || !notifDropdown) return;

    function renderNotifs() {
      const session = Storage.get('sp_session');
      if (!session) return;
      const notifs = (Storage.get('sp_notifications') || [])
        .filter(n => n.userId === session.userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 30);

      if (!notifs.length) {
        notifList.innerHTML = '<div class="notif-empty">Tidak ada notifikasi</div>';
        return;
      }

      notifList.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}" data-ref-type="${n.referenceType || ''}" data-ref-id="${n.referenceId || ''}">
          <div class="notif-item-dot ${n.isRead ? 'read' : ''}"></div>
          <div class="notif-item-body">
            <div class="notif-item-title">${Utils.escapeHtml(n.title)}</div>
            <div class="notif-item-msg">${Utils.escapeHtml(n.message || '')}</div>
            <div class="notif-item-time">${Utils.timeAgo(n.createdAt)}</div>
          </div>
        </div>`).join('');

      notifList.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', () => {
          const id      = el.dataset.id;
          const refType = el.dataset.refType;
          const refId   = el.dataset.refId;

          Storage.update('sp_notifications', arr =>
            (arr || []).map(n => n.id === id ? { ...n, isRead: true } : n)
          );
          notifDropdown.classList.add('hidden');
          App.refreshNotifBadge();

          if (refType === 'task' && refId)   window.location.href = `./task-detail.html?id=${refId}`;
          if (refType === 'sprint' && refId) window.location.href = `./sprint.html?id=${refId}`;
          if (refType === 'project' && refId) window.location.href = `./project-detail.html?id=${refId}`;
        });
      });
    }

    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const hidden = notifDropdown.classList.contains('hidden');
      document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
      if (hidden) {
        const rect = notifBtn.getBoundingClientRect();
        notifDropdown.style.top   = (rect.bottom + 4) + 'px';
        notifDropdown.style.right = (window.innerWidth - rect.right) + 'px';
        notifDropdown.style.left  = 'auto';
        notifDropdown.classList.remove('hidden');
        renderNotifs();
      }
    });

    markAllBtn && markAllBtn.addEventListener('click', () => {
      const session = Storage.get('sp_session');
      if (!session) return;
      Storage.update('sp_notifications', arr =>
        (arr || []).map(n => n.userId === session.userId ? { ...n, isRead: true } : n)
      );
      App.refreshNotifBadge();
      renderNotifs();
    });

    const clearAllBtn = document.getElementById('notif-clear-all');
    clearAllBtn && clearAllBtn.addEventListener('click', () => {
      const session = Storage.get('sp_session');
      if (!session) return;
      Storage.update('sp_notifications', arr =>
        (arr || []).filter(n => n.userId !== session.userId)
      );
      App.refreshNotifBadge();
      renderNotifs();
    });
  }

  function _setupAvatarDropdown() {
    const btn      = document.getElementById('topbar-avatar-btn');
    const dropdown = document.getElementById('avatar-dropdown');
    const logoutBtn= document.getElementById('topbar-logout-btn');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const hidden = dropdown.classList.contains('hidden');
      document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
      if (hidden) {
        const rect = btn.getBoundingClientRect();
        dropdown.style.top   = (rect.bottom + 4) + 'px';
        dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        dropdown.style.left  = 'auto';
        dropdown.classList.remove('hidden');
      }
    });

    logoutBtn && logoutBtn.addEventListener('click', () => Auth.logout());
  }

  function _populateUserInfo() {
    const session = Storage.get('sp_session');
    if (!session) return;
    const users = Storage.get('sp_users') || [];
    const user  = users.find(u => u.id === session.userId);
    if (!user) return;

    const nameEl    = document.getElementById('sidebar-user-name');
    const roleEl    = document.getElementById('sidebar-user-role');
    const avatarEl  = document.getElementById('sidebar-user-avatar');
    const topAvatar = document.getElementById('topbar-avatar');
    const ddName    = document.getElementById('dropdown-user-name');
    const ddEmail   = document.getElementById('dropdown-user-email');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = Utils.getRoleLabel(user.role);
    if (ddName)  ddName.textContent  = user.name;
    if (ddEmail) ddEmail.textContent = user.email;

    const av = Utils.createAvatarEl(user, 'sm');
    if (avatarEl) { avatarEl.replaceWith(av); av.id = 'sidebar-user-avatar'; }

    const av2 = Utils.createAvatarEl(user, 'sm');
    if (topAvatar) { topAvatar.replaceWith(av2); av2.id = 'topbar-avatar'; }

    // Sidebar user → navigate to profile
    const sidebarUserBtn = document.getElementById('sidebar-user-btn');
    if (sidebarUserBtn) {
      sidebarUserBtn.addEventListener('click', (e) => {
        if (!e.target.closest('#sidebar-logout')) {
          window.location.href = './profile.html';
        }
      });
    }
  }

  function _setupLogout() {
    const btn = document.getElementById('sidebar-logout');
    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); Auth.logout(); });
  }

  /**
   * Inject sidebar + topbar into existing .app-shell structure.
   * Must be called after DOM is ready; pages must have
   *   <aside id="sidebar" class="sidebar">  and
   *   <header class="topbar"> already in HTML.
   */
  function applyTo(pageId, pageTitle) {
    _injectStyles();

    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.innerHTML = _buildSidebarHTML(pageId);

    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.innerHTML = _buildTopbarHTML(pageTitle);

    _populateUserInfo();
    _setupLogout();
    _setupNotifDropdown();
    _setupAvatarDropdown();
  }

  return { applyTo };
})();
