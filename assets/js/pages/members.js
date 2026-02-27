/* SIMPRO Page: members — v0.14.4 (BUG-17) */
const MembersPage = (() => {
  let _session = null;
  let _isAdmin = false;
  let _isPM = false;
  let _allUsers = [];
  let _totalVisible = 0;
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

    const addBtn = document.getElementById('btn-add-user');
    if (addBtn) addBtn.style.display = _isAdmin ? '' : 'none';

    const pmNotice = document.getElementById('pm-view-notice');
    if (pmNotice) pmNotice.style.display = _isPM ? '' : 'none';

    _bindEvents();
    _loadAndRender();
  }

  function _getVisibleUsers() {
    const allUsers = Storage.get('sp_users') || [];
    if (_isAdmin) return allUsers;

    const projects = (Storage.get('sp_projects') || []).filter(p =>
      Array.isArray(p.memberIds) && p.memberIds.includes(_session.userId)
    );
    const memberIdSet = new Set([_session.userId]);
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
      Array.isArray(p.memberIds) && p.memberIds.includes(userId)
    ).length;
  }

  function _getUserTaskCount(userId) {
    return (Storage.get('sp_tasks') || []).filter(t =>
      Array.isArray(t.assigneeIds) && t.assigneeIds.includes(userId)
    ).length;
  }

  function _getUserProjects(userId) {
    return (Storage.get('sp_projects') || []).filter(p =>
      Array.isArray(p.memberIds) && p.memberIds.includes(userId)
    );
  }

  function _loadAndRender() {
    const visible = _getVisibleUsers();
    _totalVisible = visible.length;
    _allUsers = _applyFilters(visible);

    const countEl = document.getElementById('member-count');
    if (countEl) {
      const hasFilter = _searchQ || _filterRole || _filterStatus;
      countEl.textContent = hasFilter
        ? _allUsers.length + ' dari ' + _totalVisible + ' user'
        : _allUsers.length + ' user';
    }

    _updateFilterIndicators();

    const tbody = document.getElementById('members-tbody');
    if (!tbody) return;

    if (!_allUsers.length) {
      tbody.innerHTML = '<tr><td colspan="7">' +
        '<div class="members-empty">' +
        '<div class="members-empty-icon"><i data-lucide="users" style="width:48px;height:48px;"></i></div>' +
        '<p>Tidak ada user yang cocok dengan filter</p>' +
        '</div></td></tr>';
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = _allUsers.map(u => _renderRow(u)).join('');

    tbody.querySelectorAll('[data-action="detail"]').forEach(function(el) {
      el.addEventListener('click', function() { _openDetail(el.dataset.id); });
    });
    tbody.querySelectorAll('[data-action="edit"]').forEach(function(el) {
      el.addEventListener('click', function(e) { e.stopPropagation(); _openModal(el.dataset.id); });
    });
    tbody.querySelectorAll('[data-action="toggle"]').forEach(function(el) {
      el.addEventListener('click', function(e) { e.stopPropagation(); _toggleActive(el.dataset.id); });
    });

    if (window.lucide) lucide.createIcons();
  }

  function _updateFilterIndicators() {
    var hasFilter = _searchQ || _filterRole || _filterStatus;
    var clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) clearBtn.style.display = hasFilter ? '' : 'none';

    // Update select visual state — add active class if filter is set
    var filterRole = document.getElementById('filter-role');
    var filterStatus = document.getElementById('filter-status');
    if (filterRole) filterRole.classList.toggle('filter-active', !!_filterRole);
    if (filterStatus) filterStatus.classList.toggle('filter-active', !!_filterStatus);

    // Update active filter pills
    var pillsEl = document.getElementById('filter-active-pills');
    if (!pillsEl) return;
    var pills = [];
    if (_filterRole) {
      var roleLabels = { admin: 'Admin', pm: 'Project Manager', developer: 'Developer', viewer: 'Viewer' };
      pills.push('<span class="filter-pill" data-clear="role">Role: ' + (roleLabels[_filterRole] || _filterRole) + ' <button class="filter-pill-clear" data-clear="role" aria-label="Hapus filter role">&#x2715;</button></span>');
    }
    if (_filterStatus) {
      pills.push('<span class="filter-pill" data-clear="status">Status: ' + (_filterStatus === 'active' ? 'Aktif' : 'Nonaktif') + ' <button class="filter-pill-clear" data-clear="status" aria-label="Hapus filter status">&#x2715;</button></span>');
    }
    if (_searchQ) {
      pills.push('<span class="filter-pill" data-clear="search">Cari: &ldquo;' + Utils.escapeHtml(_searchQ) + '&rdquo; <button class="filter-pill-clear" data-clear="search" aria-label="Hapus pencarian">&#x2715;</button></span>');
    }
    pillsEl.innerHTML = pills.join('');

    // Bind pill clear buttons
    pillsEl.querySelectorAll('.filter-pill-clear').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var type = btn.dataset.clear;
        if (type === 'role') {
          _filterRole = '';
          var fr = document.getElementById('filter-role');
          if (fr) fr.value = '';
        } else if (type === 'status') {
          _filterStatus = '';
          var fs = document.getElementById('filter-status');
          if (fs) fs.value = '';
        } else if (type === 'search') {
          _searchQ = '';
          var si = document.getElementById('search-input');
          if (si) si.value = '';
        }
        _loadAndRender();
      });
    });
  }

  function _renderRow(u) {
    var colors = Utils.getAvatarColor(u.id);
    var fg = colors[0], bg = colors[1];
    var initials = Utils.getInitials(u.name || '');
    var avatarHtml = u.avatar
      ? '<div class="avatar avatar-sm"><img src="' + u.avatar + '" alt="' + Utils.escapeHtml(u.name || '') + '"></div>'
      : '<div class="avatar avatar-sm" style="background:' + bg + ';color:' + fg + ';">' + initials + '</div>';

    var roleCls    = Utils.getRoleColor(u.role);
    var roleLabel  = Utils.getRoleLabel(u.role);
    var projectCount = _getUserProjectCount(u.id);
    var taskCount    = _getUserTaskCount(u.id);
    var lastLogin    = u.lastLoginAt ? Utils.timeAgo(u.lastLoginAt) : '—';
    var isActive     = u.isActive !== false;
    var statusHtml   = '<span class="status-dot ' + (isActive ? 'active' : 'inactive') + '">' + (isActive ? 'Aktif' : 'Nonaktif') + '</span>';
    var inactiveCls  = !isActive ? ' inactive' : '';

    var actionHtml = _isAdmin
      ? '<div class="member-actions">' +
          '<button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="' + u.id + '" data-tooltip="Edit"><i data-lucide="pencil"></i></button>' +
          '<button class="btn btn-ghost btn-icon btn-sm" data-action="toggle" data-id="' + u.id + '" data-tooltip="' + (isActive ? 'Nonaktifkan' : 'Aktifkan') + '" style="color:' + (isActive ? 'var(--color-danger)' : 'var(--color-success)') + ';"><i data-lucide="' + (isActive ? 'user-x' : 'user-check') + '"></i></button>' +
        '</div>'
      : '';

    return '<tr class="' + inactiveCls + '">' +
      '<td><div class="member-name-cell">' + avatarHtml +
        '<div class="member-name-info">' +
          '<span class="member-name-link" data-action="detail" data-id="' + u.id + '">' + Utils.escapeHtml(u.name || '') + '</span>' +
          '<span class="member-email">' + Utils.escapeHtml(u.email || '') + '</span>' +
        '</div></div></td>' +
      '<td><span class="badge ' + roleCls + '">' + roleLabel + '</span></td>' +
      '<td style="font-family:var(--font-mono);font-size:var(--text-sm);">' + projectCount + '</td>' +
      '<td style="font-family:var(--font-mono);font-size:var(--text-sm);">' + taskCount + '</td>' +
      '<td style="font-size:var(--text-sm);color:var(--color-text-2);">' + lastLogin + '</td>' +
      '<td>' + statusHtml + '</td>' +
      '<td>' + actionHtml + '</td>' +
    '</tr>';
  }

  function _bindEvents() {
    var searchEl = document.getElementById('search-input');
    if (searchEl) {
      searchEl.addEventListener('input', Utils.debounce(function(e) {
        _searchQ = e.target.value.trim(); _loadAndRender();
      }, 200));
    }

    var filterRole = document.getElementById('filter-role');
    if (filterRole) filterRole.addEventListener('change', function(e) { _filterRole = e.target.value; _loadAndRender(); });

    var filterStatus = document.getElementById('filter-status');
    if (filterStatus) filterStatus.addEventListener('change', function(e) { _filterStatus = e.target.value; _loadAndRender(); });

    var clearFiltersBtn = document.getElementById('btn-clear-filters');
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', function() {
      _searchQ = ''; _filterRole = ''; _filterStatus = '';
      var si = document.getElementById('search-input');
      var fr = document.getElementById('filter-role');
      var fs = document.getElementById('filter-status');
      if (si) si.value = '';
      if (fr) fr.value = '';
      if (fs) fs.value = '';
      _loadAndRender();
    });

    var addBtn = document.getElementById('btn-add-user');
    if (addBtn) addBtn.addEventListener('click', function() { _openModal(null); });

    var closeBtn = document.getElementById('modal-user-close');
    if (closeBtn) closeBtn.addEventListener('click', _closeModal);

    var cancelBtn = document.getElementById('btn-user-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', _closeModal);

    var modalUser = document.getElementById('modal-user');
    if (modalUser) modalUser.addEventListener('click', function(e) {
      if (e.target === modalUser) _closeModal();
    });

    var saveBtn = document.getElementById('btn-user-save');
    if (saveBtn) saveBtn.addEventListener('click', _saveUser);

    var detailClose = document.getElementById('modal-detail-close');
    if (detailClose) detailClose.addEventListener('click', _closeDetail);

    var detailCloseBtn = document.getElementById('btn-detail-close');
    if (detailCloseBtn) detailCloseBtn.addEventListener('click', _closeDetail);

    var modalDetail = document.getElementById('modal-user-detail');
    if (modalDetail) modalDetail.addEventListener('click', function(e) {
      if (e.target === modalDetail) _closeDetail();
    });

    var detailEditBtn = document.getElementById('btn-detail-edit');
    if (detailEditBtn) detailEditBtn.addEventListener('click', function() {
      var uid = _detailUserId;
      _closeDetail();
      _openModal(uid);
    });

    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      var mu = document.getElementById('modal-user');
      var md = document.getElementById('modal-user-detail');
      if (mu && !mu.classList.contains('hidden')) _closeModal();
      else if (md && !md.classList.contains('hidden')) _closeDetail();
    });
  }

  function _openModal(userId) {
    if (!_isAdmin) return;
    _editingUserId = userId || null;

    var titleEl  = document.getElementById('modal-user-title');
    var nameEl   = document.getElementById('input-user-name');
    var emailEl  = document.getElementById('input-user-email');
    var roleEl   = document.getElementById('input-user-role');
    var passEl   = document.getElementById('input-user-password');
    var bioEl    = document.getElementById('input-user-bio');
    var activeEl = document.getElementById('input-user-active');
    var pwReq    = document.getElementById('pw-required');
    var activeRow = document.getElementById('active-toggle-row');
    var passHint  = document.getElementById('pw-hint');
    var saveBtn  = document.getElementById('btn-user-save');

    // Full reset setiap kali modal dibuka
    if (nameEl)   nameEl.value   = '';
    if (emailEl)  emailEl.value  = '';
    if (roleEl)   roleEl.value   = 'developer';
    if (passEl)   passEl.value   = '';
    if (bioEl)    bioEl.value    = '';
    if (activeEl) activeEl.checked = true;
    if (saveBtn)  saveBtn.disabled = false;

    // Hapus error state
    [nameEl, emailEl, passEl].forEach(function(el) {
      if (el) el.classList.remove('input-error');
    });

    if (userId) {
      if (titleEl)   titleEl.textContent  = 'Edit User';
      if (passEl)    passEl.placeholder = 'Kosongkan jika tidak diubah';
      if (pwReq)     pwReq.style.display = 'none';
      if (passHint)  passHint.textContent = 'Kosongkan jika tidak ingin mengubah password';
      if (activeRow) activeRow.style.display = '';

      var u = (Storage.get('sp_users') || []).find(function(x) { return x.id === userId; });
      if (u) {
        if (nameEl)   nameEl.value   = u.name  || '';
        if (emailEl)  emailEl.value  = u.email || '';
        if (roleEl)   roleEl.value   = u.role  || 'developer';
        if (bioEl)    bioEl.value    = u.bio   || '';
        if (activeEl) activeEl.checked = u.isActive !== false;
      }
    } else {
      if (titleEl)   titleEl.textContent  = 'Tambah User';
      if (passEl)    passEl.placeholder = 'Min. 6 karakter';
      if (pwReq)     pwReq.style.display = '';
      if (passHint)  passHint.textContent = 'Wajib diisi, minimal 6 karakter';
      if (activeRow) activeRow.style.display = 'none';
    }

    var modal = document.getElementById('modal-user');
    if (modal) { modal.classList.remove('hidden'); modal.removeAttribute('aria-hidden'); }
    if (window.lucide) lucide.createIcons();
    setTimeout(function() { if (nameEl) nameEl.focus(); }, 50);
  }

  function _closeModal() {
    var modal = document.getElementById('modal-user');
    if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
    _editingUserId = null;
  }

  // ── KRITIS: _saveUser harus async ──
  // Storage.update adalah SYNCHRONOUS. Jangan pernah pass async callback ke Storage.update.
  // Hash password DULU (async/await), KEMUDIAN panggil Storage.update dengan callback sync.
  async function _saveUser() {
    if (!_isAdmin) return;

    var nameEl   = document.getElementById('input-user-name');
    var emailEl  = document.getElementById('input-user-email');
    var roleEl   = document.getElementById('input-user-role');
    var passEl   = document.getElementById('input-user-password');
    var bioEl    = document.getElementById('input-user-bio');
    var activeEl = document.getElementById('input-user-active');
    var saveBtn  = document.getElementById('btn-user-save');

    var name     = nameEl  ? nameEl.value.trim()            : '';
    var email    = emailEl ? emailEl.value.trim().toLowerCase() : '';
    var role     = roleEl  ? roleEl.value                   : 'developer';
    var password = passEl  ? passEl.value                   : '';
    var bio      = bioEl   ? bioEl.value.trim()             : '';
    var isActive = activeEl ? activeEl.checked              : true;

    if (!name)  { App.Toast.error('Nama wajib diisi'); return; }
    if (!email || !email.includes('@')) { App.Toast.error('Email tidak valid'); return; }

    var users = Storage.get('sp_users') || [];

    if (saveBtn) saveBtn.disabled = true;

    try {
      if (_editingUserId) {
        var dup = users.find(function(u) { return u.email === email && u.id !== _editingUserId; });
        if (dup) { App.Toast.error('Email sudah digunakan user lain'); return; }

        // Hash dulu sebelum Storage.update (Storage.update SYNCHRONOUS)
        var hashedPassword = null;
        if (password) {
          if (password.length < 6) { App.Toast.error('Password minimal 6 karakter'); return; }
          hashedPassword = await Utils.hashPassword(password);
        }

        var updateData = { name: name, email: email, role: role, bio: bio, isActive: isActive, updatedAt: Utils.nowISO() };
        if (hashedPassword) updateData.password = hashedPassword;

        var editId = _editingUserId;
        Storage.update('sp_users', function(arr) {
          return (arr || []).map(function(u) {
            return u.id === editId ? Object.assign({}, u, updateData) : u;
          });
        });
        App.Toast.success('User berhasil diupdate');

      } else {
        if (!password) { App.Toast.error('Password wajib diisi'); return; }
        if (password.length < 6) { App.Toast.error('Password minimal 6 karakter'); return; }
        if (users.find(function(u) { return u.email === email; })) {
          App.Toast.error('Email sudah terdaftar'); return;
        }

        // Hash dulu sebelum Storage.update (Storage.update SYNCHRONOUS)
        var newHash = await Utils.hashPassword(password);
        var newUser = {
          id: Utils.generateId('user'),
          name: name, email: email, role: role, bio: bio,
          password: newHash,
          avatar: null,
          isActive: true,
          createdAt: Utils.nowISO(),
          lastLoginAt: null
        };

        Storage.update('sp_users', function(arr) {
          return (arr || []).concat([newUser]);
        });
        App.Toast.success('User berhasil ditambahkan');
      }

      _closeModal();
      _loadAndRender();

    } catch (err) {
      console.error('[MembersPage] _saveUser error:', err);
      App.Toast.error('Gagal menyimpan user. Coba lagi.');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function _toggleActive(userId) {
    if (!_isAdmin) return;
    if (userId === _session.userId) {
      App.Toast.warning('Tidak bisa menonaktifkan akun sendiri');
      return;
    }
    var u = (Storage.get('sp_users') || []).find(function(x) { return x.id === userId; });
    if (!u) return;

    var newActive = !(u.isActive !== false);
    Storage.update('sp_users', function(arr) {
      return (arr || []).map(function(x) {
        return x.id === userId ? Object.assign({}, x, { isActive: newActive }) : x;
      });
    });
    App.Toast.success(newActive ? 'Akun diaktifkan' : 'Akun dinonaktifkan');
    _loadAndRender();
  }

  function _openDetail(userId) {
    _detailUserId = userId;
    var u = (Storage.get('sp_users') || []).find(function(x) { return x.id === userId; });
    if (!u) return;

    var projects    = _getUserProjects(userId);
    var taskCount   = _getUserTaskCount(userId);
    var totalHours  = (typeof TimeLog !== 'undefined' && TimeLog.getTotalByUser)
      ? TimeLog.getTotalByUser(userId)
      : 0;
    var allTasks    = Storage.get('sp_tasks') || [];

    var colors = Utils.getAvatarColor(u.id);
    var fg = colors[0], bg = colors[1];
    var avatarHtml = u.avatar
      ? '<div class="avatar avatar-lg"><img src="' + u.avatar + '" alt="' + Utils.escapeHtml(u.name || '') + '"></div>'
      : '<div class="avatar avatar-lg" style="background:' + bg + ';color:' + fg + ';">' + Utils.getInitials(u.name || '') + '</div>';

    var projectsHtml = projects.length
      ? projects.map(function(p) {
          var pTasks = allTasks.filter(function(t) {
            return t.projectId === p.id && Array.isArray(t.assigneeIds) && t.assigneeIds.includes(userId);
          });
          var pRole = p.memberRoles && p.memberRoles[userId]
            ? Utils.getRoleLabel(p.memberRoles[userId])
            : Utils.getRoleLabel(u.role);
          return '<div class="user-project-item">' +
            '<div class="user-project-dot" style="background:' + (p.color || 'var(--color-accent)') + ';"></div>' +
            '<span class="user-project-name">' + Utils.escapeHtml(p.name || '') + '</span>' +
            '<span class="user-project-role">' + pRole + '</span>' +
            '<span class="user-project-tasks">' + pTasks.length + ' task</span>' +
          '</div>';
        }).join('')
      : '<p style="color:var(--color-text-3);font-size:var(--text-sm);margin:0;">Tidak ada project</p>';

    var isActive = u.isActive !== false;
    var detailBody = document.getElementById('modal-detail-body');
    if (detailBody) {
      detailBody.innerHTML =
        '<div class="modal-user-header">' + avatarHtml +
          '<div class="modal-user-header-info">' +
            '<h3>' + Utils.escapeHtml(u.name || '') + '</h3>' +
            '<p>' + Utils.escapeHtml(u.email || '') + '</p>' +
            '<div style="display:flex;align-items:center;gap:var(--sp-2);margin-top:var(--sp-2);">' +
              '<span class="badge ' + Utils.getRoleColor(u.role) + '">' + Utils.getRoleLabel(u.role) + '</span>' +
              '<span class="status-dot ' + (isActive ? 'active' : 'inactive') + '">' + (isActive ? 'Aktif' : 'Nonaktif') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        (u.bio ? '<p style="font-size:var(--text-sm);color:var(--color-text-2);margin-bottom:var(--sp-5);">' + Utils.escapeHtml(u.bio) + '</p>' : '') +
        '<div class="user-stats-row">' +
          '<div class="user-stat-card"><div class="user-stat-value">' + projects.length + '</div><div class="user-stat-label">Project</div></div>' +
          '<div class="user-stat-card"><div class="user-stat-value">' + taskCount + '</div><div class="user-stat-label">Total Task</div></div>' +
          '<div class="user-stat-card"><div class="user-stat-value">' + Utils.formatHours(totalHours) + '</div><div class="user-stat-label">Jam Dicatat</div></div>' +
        '</div>' +
        '<div><div class="modal-section-label">Project yang Diikuti</div>' +
        '<div class="user-project-list">' + projectsHtml + '</div></div>' +
        '<div style="margin-top:var(--sp-4);font-size:var(--text-xs);color:var(--color-text-3);">' +
          'Bergabung: ' + Utils.formatDate(u.createdAt) + ' &nbsp;&middot;&nbsp; ' +
          'Login terakhir: ' + (u.lastLoginAt ? Utils.timeAgo(u.lastLoginAt) : 'Belum pernah') +
        '</div>';
    }

    var detailEditBtn = document.getElementById('btn-detail-edit');
    if (detailEditBtn) detailEditBtn.style.display = _isAdmin ? '' : 'none';

    var modal = document.getElementById('modal-user-detail');
    if (modal) { modal.classList.remove('hidden'); modal.removeAttribute('aria-hidden'); }
    if (window.lucide) lucide.createIcons();
  }

  function _closeDetail() {
    var modal = document.getElementById('modal-user-detail');
    if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
    _detailUserId = null;
  }

  return { init: init };
})();

// Page alias used by members.html init script
const Page = MembersPage;
