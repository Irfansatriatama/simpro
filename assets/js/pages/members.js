/* SIMPRO Page: members — v0.14.0 */
const MembersPage = (() => {
  let _session = null;
  let _isAdmin = false;
  let _isPM = false;
  let _allUsers = [];
  let _searchQ = '';
  let _filterRole = '';
  let _filterStatus = '';
  let _editingUserId = null;
  let _detailUserId = null;

  function init() {
    _session = Storage.get('sp_session');
    if (!_session) return;
    _isAdmin = _session.role === 'admin';
    _isPM    = _session.role === 'pm';

    if (_isAdmin) document.getElementById('btn-add-user').style.display = '';
    if (_isPM)    document.getElementById('pm-view-notice').style.display = '';

    _bindEvents();
    _loadAndRender();
  }

  function _getVisibleUsers() {
    const allUsers = Storage.get('sp_users') || [];
    if (_isAdmin) return allUsers;

    const projects = (Storage.get('sp_projects') || []).filter(p =>
      (p.memberIds || []).includes(_session.userId)
    );
    const memberIdSet = new Set();
    projects.forEach(p => (p.memberIds || []).forEach(id => memberIdSet.add(id)));
    return allUsers.filter(u => memberIdSet.has(u.id));
  }

  function _applyFilters(users) {
    let result = users;
    if (_searchQ) {
      const q = _searchQ.toLowerCase();
      result = result.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    if (_filterRole)   result = result.filter(u => u.role === _filterRole);
    if (_filterStatus) result = result.filter(u =>
      _filterStatus === 'active' ? u.isActive !== false : u.isActive === false
    );
    return result;
  }

  function _getUserProjectCount(userId) {
    return (Storage.get('sp_projects') || []).filter(p =>
      (p.memberIds || []).includes(userId)
    ).length;
  }

  function _getUserTaskCount(userId) {
    return (Storage.get('sp_tasks') || []).filter(t =>
      (t.assigneeIds || []).includes(userId)
    ).length;
  }

  function _getUserProjects(userId) {
    return (Storage.get('sp_projects') || []).filter(p =>
      (p.memberIds || []).includes(userId)
    );
  }

  function _loadAndRender() {
    const visible = _getVisibleUsers();
    _allUsers = _applyFilters(visible);

    document.getElementById('member-count').textContent =
      `${_allUsers.length} user`;

    const tbody = document.getElementById('members-tbody');
    if (!_allUsers.length) {
      tbody.innerHTML = `<tr><td colspan="7">
        <div class="members-empty">
          <div class="members-empty-icon"><i data-lucide="users" style="width:48px;height:48px;"></i></div>
          <p>Tidak ada user yang cocok dengan filter</p>
        </div>
      </td></tr>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = _allUsers.map(u => _renderRow(u)).join('');

    tbody.querySelectorAll('[data-action="detail"]').forEach(el => {
      el.addEventListener('click', () => _openDetail(el.dataset.id));
    });
    tbody.querySelectorAll('[data-action="edit"]').forEach(el => {
      el.addEventListener('click', e => { e.stopPropagation(); _openModal(el.dataset.id); });
    });
    tbody.querySelectorAll('[data-action="toggle"]').forEach(el => {
      el.addEventListener('click', e => { e.stopPropagation(); _toggleActive(el.dataset.id); });
    });

    if (window.lucide) lucide.createIcons();
  }

  function _renderRow(u) {
    const [fg, bg] = Utils.getAvatarColor(u.id);
    const initials = Utils.getInitials(u.name);
    const avatarHtml = u.avatar
      ? `<div class="avatar avatar-sm"><img src="${u.avatar}" alt="${Utils.escapeHtml(u.name)}"></div>`
      : `<div class="avatar avatar-sm" style="background:${bg};color:${fg};">${initials}</div>`;

    const roleCls  = Utils.getRoleColor(u.role);
    const roleLabel = Utils.getRoleLabel(u.role);
    const projectCount = _getUserProjectCount(u.id);
    const taskCount = _getUserTaskCount(u.id);
    const lastLogin = u.lastLoginAt ? Utils.timeAgo(u.lastLoginAt) : '—';
    const isActive = u.isActive !== false;
    const statusHtml = `<span class="status-dot ${isActive ? 'active' : 'inactive'}">${isActive ? 'Aktif' : 'Nonaktif'}</span>`;
    const inactiveCls = !isActive ? ' inactive' : '';

    const actionHtml = _isAdmin ? `
      <div class="member-actions">
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${u.id}" data-tooltip="Edit">
          <i data-lucide="pencil"></i>
        </button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="toggle" data-id="${u.id}"
          data-tooltip="${isActive ? 'Nonaktifkan' : 'Aktifkan'}"
          style="color:${isActive ? 'var(--color-danger)' : 'var(--color-success)'};">
          <i data-lucide="${isActive ? 'user-x' : 'user-check'}"></i>
        </button>
      </div>` : '';

    return `<tr class="${inactiveCls}">
      <td>
        <div class="member-name-cell">
          ${avatarHtml}
          <div class="member-name-info">
            <span class="member-name-link" data-action="detail" data-id="${u.id}">${Utils.escapeHtml(u.name)}</span>
            <span class="member-email">${Utils.escapeHtml(u.email)}</span>
          </div>
        </div>
      </td>
      <td><span class="badge ${roleCls}">${roleLabel}</span></td>
      <td style="font-family:var(--font-mono);font-size:var(--text-sm);">${projectCount}</td>
      <td style="font-family:var(--font-mono);font-size:var(--text-sm);">${taskCount}</td>
      <td style="font-size:var(--text-sm);color:var(--color-text-2);">${lastLogin}</td>
      <td>${statusHtml}</td>
      <td>${actionHtml}</td>
    </tr>`;
  }

  function _bindEvents() {
    document.getElementById('search-input').addEventListener('input',
      Utils.debounce(e => { _searchQ = e.target.value.trim(); _loadAndRender(); }, 200)
    );
    document.getElementById('filter-role').addEventListener('change', e => {
      _filterRole = e.target.value; _loadAndRender();
    });
    document.getElementById('filter-status').addEventListener('change', e => {
      _filterStatus = e.target.value; _loadAndRender();
    });

    const addBtn = document.getElementById('btn-add-user');
    if (addBtn) addBtn.addEventListener('click', () => _openModal(null));

    document.getElementById('modal-user-close').addEventListener('click', _closeModal);
    document.getElementById('btn-user-cancel').addEventListener('click', _closeModal);
    document.getElementById('modal-user').addEventListener('click', e => {
      if (e.target.classList.contains('modal-overlay')) _closeModal();
    });
    document.getElementById('btn-user-save').addEventListener('click', _saveUser);

    document.getElementById('modal-detail-close').addEventListener('click', _closeDetail);
    document.getElementById('btn-detail-close').addEventListener('click', _closeDetail);
    document.getElementById('modal-user-detail').addEventListener('click', e => {
      if (e.target.classList.contains('modal-overlay')) _closeDetail();
    });
    document.getElementById('btn-detail-edit').addEventListener('click', () => {
      _closeDetail(); _openModal(_detailUserId);
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (document.getElementById('modal-user').style.display !== 'none') _closeModal();
      else if (document.getElementById('modal-user-detail').style.display !== 'none') _closeDetail();
    });
  }

  function _openModal(userId) {
    if (!_isAdmin) return;
    _editingUserId = userId || null;

    document.getElementById('modal-user-title').textContent = userId ? 'Edit User' : 'Tambah User';
    document.getElementById('input-user-name').value    = '';
    document.getElementById('input-user-email').value   = '';
    document.getElementById('input-user-role').value    = 'developer';
    document.getElementById('input-user-password').value = '';
    document.getElementById('input-user-bio').value     = '';
    document.getElementById('input-user-active').checked = true;

    const pwRequired = document.getElementById('pw-required');

    if (userId) {
      document.getElementById('input-user-password').placeholder = 'Kosongkan jika tidak diubah';
      if (pwRequired) pwRequired.style.display = 'none';
      document.getElementById('active-toggle-row').style.display = '';

      const u = (Storage.get('sp_users') || []).find(x => x.id === userId);
      if (u) {
        document.getElementById('input-user-name').value  = u.name;
        document.getElementById('input-user-email').value = u.email;
        document.getElementById('input-user-role').value  = u.role;
        document.getElementById('input-user-bio').value   = u.bio || '';
        document.getElementById('input-user-active').checked = u.isActive !== false;
      }
    } else {
      document.getElementById('input-user-password').placeholder = 'Min. 6 karakter';
      if (pwRequired) pwRequired.style.display = '';
      document.getElementById('active-toggle-row').style.display = 'none';
    }

    document.getElementById('modal-user').style.display = 'flex';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => document.getElementById('input-user-name').focus(), 50);
  }

  function _closeModal() {
    document.getElementById('modal-user').style.display = 'none';
    _editingUserId = null;
  }

  async function _saveUser() {
    if (!_isAdmin) return;

    const name     = document.getElementById('input-user-name').value.trim();
    const email    = document.getElementById('input-user-email').value.trim().toLowerCase();
    const role     = document.getElementById('input-user-role').value;
    const password = document.getElementById('input-user-password').value;
    const bio      = document.getElementById('input-user-bio').value.trim();
    const isActive = document.getElementById('input-user-active').checked;

    if (!name)  { App.Toast.error('Nama wajib diisi'); return; }
    if (!email || !email.includes('@')) { App.Toast.error('Email tidak valid'); return; }

    const users = Storage.get('sp_users') || [];

    if (_editingUserId) {
      const dup = users.find(u => u.email === email && u.id !== _editingUserId);
      if (dup) { App.Toast.error('Email sudah digunakan user lain'); return; }

      const updateData = { name, email, role, bio, isActive, updatedAt: Utils.nowISO() };
      if (password) {
        if (password.length < 6) { App.Toast.error('Password minimal 6 karakter'); return; }
        updateData.password = await Utils.hashPassword(password);
      }

      Storage.update('sp_users', arr =>
        arr.map(u => u.id === _editingUserId ? { ...u, ...updateData } : u)
      );
      App.Toast.success('User berhasil diupdate');
    } else {
      if (!password) { App.Toast.error('Password wajib diisi'); return; }
      if (password.length < 6) { App.Toast.error('Password minimal 6 karakter'); return; }
      if (users.find(u => u.email === email)) { App.Toast.error('Email sudah terdaftar'); return; }

      Storage.update('sp_users', arr => [...(arr || []), {
        id: Utils.generateId('user'),
        name, email, role, bio,
        password: await Utils.hashPassword(password),
        avatar: null,
        isActive: true,
        createdAt: Utils.nowISO(),
        lastLoginAt: null
      }]);
      App.Toast.success('User berhasil ditambahkan');
    }

    _closeModal();
    _loadAndRender();
  }

  function _toggleActive(userId) {
    if (!_isAdmin) return;
    if (userId === _session.userId) {
      App.Toast.warning('Tidak bisa menonaktifkan akun sendiri');
      return;
    }
    const u = (Storage.get('sp_users') || []).find(x => x.id === userId);
    if (!u) return;

    const newActive = !(u.isActive !== false);
    Storage.update('sp_users', arr =>
      arr.map(x => x.id === userId ? { ...x, isActive: newActive } : x)
    );
    App.Toast.success(newActive ? 'Akun diaktifkan' : 'Akun dinonaktifkan');
    _loadAndRender();
  }

  function _openDetail(userId) {
    _detailUserId = userId;
    const u = (Storage.get('sp_users') || []).find(x => x.id === userId);
    if (!u) return;

    const projects = _getUserProjects(userId);
    const taskCount = _getUserTaskCount(userId);
    const totalHours = TimeLog.getTotalByUser(userId);
    const allTasks = Storage.get('sp_tasks') || [];

    const [fg, bg] = Utils.getAvatarColor(u.id);
    const avatarHtml = u.avatar
      ? `<div class="avatar avatar-lg"><img src="${u.avatar}" alt="${Utils.escapeHtml(u.name)}"></div>`
      : `<div class="avatar avatar-lg" style="background:${bg};color:${fg};">${Utils.getInitials(u.name)}</div>`;

    const projectsHtml = projects.length ? projects.map(p => {
      const pTasks = allTasks.filter(t =>
        t.projectId === p.id && (t.assigneeIds || []).includes(userId)
      );
      const pRole = p.memberRoles && p.memberRoles[userId]
        ? Utils.getRoleLabel(p.memberRoles[userId])
        : Utils.getRoleLabel(u.role);
      return `<div class="user-project-item">
        <div class="user-project-dot" style="background:${p.color || 'var(--color-accent)'};"></div>
        <span class="user-project-name">${Utils.escapeHtml(p.name)}</span>
        <span class="user-project-role">${pRole}</span>
        <span class="user-project-tasks">${pTasks.length} task</span>
      </div>`;
    }).join('') : '<p style="color:var(--color-text-3);font-size:var(--text-sm);margin:0;">Tidak ada project</p>';

    const isActive = u.isActive !== false;
    document.getElementById('modal-detail-body').innerHTML = `
      <div class="modal-user-header">
        ${avatarHtml}
        <div class="modal-user-header-info">
          <h3>${Utils.escapeHtml(u.name)}</h3>
          <p>${Utils.escapeHtml(u.email)}</p>
          <div style="display:flex;align-items:center;gap:var(--sp-2);margin-top:var(--sp-2);">
            <span class="badge ${Utils.getRoleColor(u.role)}">${Utils.getRoleLabel(u.role)}</span>
            <span class="status-dot ${isActive ? 'active' : 'inactive'}">${isActive ? 'Aktif' : 'Nonaktif'}</span>
          </div>
        </div>
      </div>
      ${u.bio ? `<p style="font-size:var(--text-sm);color:var(--color-text-2);margin-bottom:var(--sp-5);">${Utils.escapeHtml(u.bio)}</p>` : ''}
      <div class="user-stats-row">
        <div class="user-stat-card">
          <div class="user-stat-value">${projects.length}</div>
          <div class="user-stat-label">Project</div>
        </div>
        <div class="user-stat-card">
          <div class="user-stat-value">${taskCount}</div>
          <div class="user-stat-label">Total Task</div>
        </div>
        <div class="user-stat-card">
          <div class="user-stat-value">${Utils.formatHours(totalHours)}</div>
          <div class="user-stat-label">Jam Dicatat</div>
        </div>
      </div>
      <div>
        <div class="modal-section-label">Project yang Diikuti</div>
        <div class="user-project-list">${projectsHtml}</div>
      </div>
      <div style="margin-top:var(--sp-4);font-size:var(--text-xs);color:var(--color-text-3);">
        Bergabung: ${Utils.formatDate(u.createdAt)} &nbsp;·&nbsp;
        Login terakhir: ${u.lastLoginAt ? Utils.timeAgo(u.lastLoginAt) : 'Belum pernah'}
      </div>`;

    document.getElementById('btn-detail-edit').style.display = _isAdmin ? '' : 'none';
    document.getElementById('modal-user-detail').style.display = 'flex';
    if (window.lucide) lucide.createIcons();
  }

  function _closeDetail() {
    document.getElementById('modal-user-detail').style.display = 'none';
    _detailUserId = null;
  }

  return { init };
})();

// Page alias used by members.html init script
const Page = MembersPage;
