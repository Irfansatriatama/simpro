/* SIMPRO Page: projects */
const ProjectsPage = (() => {
  let _currentFilter = 'active';
  let _currentView = 'grid';
  let _editingId = null;
  let _session = null;
  let _selectedColor = '#3B5BDB';

  function init() {
    _session = Storage.get('sp_session');
    if (!_session) return;

    const canCreate = _session.role === 'admin' || _session.role === 'pm';
    if (canCreate) {
      document.getElementById('btn-new-project').style.display = '';
      const emptyBtn = document.getElementById('btn-new-project-empty');
      if (emptyBtn) emptyBtn.style.display = '';
    }

    _bindEvents();
    _render();
  }

  function _bindEvents() {
    document.getElementById('btn-new-project').addEventListener('click', () => _openModal());
    const emptyBtn = document.getElementById('btn-new-project-empty');
    if (emptyBtn) emptyBtn.addEventListener('click', () => _openModal());

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _currentFilter = btn.dataset.filter;
        _render();
      });
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _currentView = btn.dataset.view;
        _switchView();
      });
    });

    document.getElementById('modal-project-close').addEventListener('click', _closeModal);
    document.getElementById('btn-project-cancel').addEventListener('click', _closeModal);
    document.getElementById('modal-project').addEventListener('click', e => {
      if (e.target.id === 'modal-project') _closeModal();
    });
    document.getElementById('btn-project-save').addEventListener('click', _save);

    // Color swatches
    document.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        _selectedColor = sw.dataset.color;
        document.getElementById('input-project-color').value = _selectedColor;
      });
    });

    document.getElementById('input-project-color').addEventListener('input', e => {
      _selectedColor = e.target.value;
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    });

    // Auto-generate key from name
    document.getElementById('input-project-name').addEventListener('input', e => {
      const keyInput = document.getElementById('input-project-key');
      if (!_editingId && !keyInput.dataset.userModified) {
        const words = e.target.value.trim().split(/\s+/);
        let key = words.map(w => w[0] || '').join('').toUpperCase().replace(/[^A-Z]/g, '');
        if (key.length > 5) key = key.slice(0, 5);
        if (key.length < 2 && words[0]) key = words[0].substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        keyInput.value = key;
      }
    });

    document.getElementById('input-project-key').addEventListener('input', e => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
      e.target.dataset.userModified = '1';
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('modal-project').classList.contains('hidden')) {
        _closeModal();
      }
    });
  }

  function _render() {
    const all = Project.getForUser(_session.userId, _session.role);
    let filtered = all;

    if (_currentFilter === 'active') filtered = all.filter(p => p.status !== 'archived');
    else if (_currentFilter === 'archived') filtered = all.filter(p => p.status === 'archived');

    const label = document.getElementById('project-count-label');
    label.textContent = `${filtered.length} project${filtered.length !== 1 ? '' : ''}`;

    const grid = document.getElementById('projects-grid');
    const list = document.getElementById('projects-list');
    const empty = document.getElementById('empty-state');

    if (filtered.length === 0) {
      grid.innerHTML = '';
      list.innerHTML = '';
      empty.classList.remove('hidden');
      const title = document.getElementById('empty-title');
      const desc = document.getElementById('empty-desc');
      if (_currentFilter === 'archived') {
        title.textContent = 'Tidak ada project di arsip';
        desc.textContent = 'Project yang diarsipkan akan muncul di sini.';
      } else {
        title.textContent = 'Belum ada project';
        desc.textContent = 'Buat project pertamamu untuk mulai mengelola task dan sprint.';
      }
    } else {
      empty.classList.add('hidden');
      grid.innerHTML = filtered.map(_buildCard).join('');
      list.innerHTML = _buildListTable(filtered);
    }

    _switchView();
    if (window.lucide) lucide.createIcons();
    _bindCardEvents();
  }

  function _buildCard(project) {
    const stats = Project.getStats(project.id);
    const users = Storage.get('sp_users') || [];
    const members = project.memberIds.slice(0, 4).map(id => users.find(u => u.id === id)).filter(Boolean);
    const extraCount = project.memberIds.length - 4;
    const sprintActive = (Storage.query('sp_sprints', s => s.projectId === project.id && s.status === 'active') || [])[0];

    const avatarStack = members.map(u => {
      const [fg, bg] = Utils.getAvatarColor(u.id);
      if (u.avatar) return `<div class="avatar avatar-xs" style="background:${bg};"><img src="${u.avatar}" alt="${Utils.escapeHtml(u.name)}"></div>`;
      return `<div class="avatar avatar-xs" style="background:${bg};color:${fg};" title="${Utils.escapeHtml(u.name)}">${Utils.getInitials(u.name)}</div>`;
    }).join('') + (extraCount > 0 ? `<div class="avatar avatar-xs avatar-more">+${extraCount}</div>` : '');

    const statusBadge = Utils.getProjectStatusLabel ? `<span class="badge badge-${Utils.getProjectStatusColor ? Utils.getProjectStatusColor(project.status) : 'neutral'}">${Utils.getProjectStatusLabel(project.status)}</span>` : '';
    const priorityDot = `<span class="priority-dot priority-${project.priority}" title="${project.priority}"></span>`;

    const isArchived = project.status === 'archived';
    const canEdit = _session.role === 'admin' || _session.role === 'pm';

    return `
    <div class="project-card ${isArchived ? 'archived' : ''}" data-id="${project.id}" style="--project-color:${project.color};">
      <div class="project-card-color-bar" style="background:${project.color};"></div>
      <div class="project-card-body">
        <div class="project-card-header">
          <div class="project-card-title-row">
            ${priorityDot}
            <a class="project-card-name" href="/pages/project-detail.html?id=${project.id}">${Utils.escapeHtml(project.name)}</a>
            <span class="badge badge-mono">${Utils.escapeHtml(project.key)}</span>
          </div>
          ${canEdit ? `
          <div class="project-card-menu">
            <button class="btn btn-ghost btn-icon btn-sm card-menu-btn" data-id="${project.id}" aria-label="Menu">
              <i data-lucide="more-horizontal" width="16" height="16"></i>
            </button>
            <div class="dropdown-menu hidden card-menu-dropdown" data-id="${project.id}">
              <a class="dropdown-item" href="/pages/project-detail.html?id=${project.id}">
                <i data-lucide="eye" width="14" height="14"></i> Lihat Detail
              </a>
              <button class="dropdown-item btn-edit-project" data-id="${project.id}">
                <i data-lucide="edit-2" width="14" height="14"></i> Edit
              </button>
              ${isArchived ? `
              <button class="dropdown-item btn-unarchive-project" data-id="${project.id}">
                <i data-lucide="archive-restore" width="14" height="14"></i> Aktifkan
              </button>` : `
              <button class="dropdown-item btn-archive-project" data-id="${project.id}">
                <i data-lucide="archive" width="14" height="14"></i> Arsipkan
              </button>`}
              <div class="dropdown-divider"></div>
              <button class="dropdown-item dropdown-item-danger btn-delete-project" data-id="${project.id}">
                <i data-lucide="trash-2" width="14" height="14"></i> Hapus
              </button>
            </div>
          </div>` : ''}
        </div>

        ${project.description ? `<p class="project-card-desc">${Utils.escapeHtml(Utils.truncate(project.description, 80))}</p>` : ''}

        <div class="project-card-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${stats.progress}%; background:${project.color};"></div>
          </div>
          <span class="progress-label">${stats.done}/${stats.total} task</span>
        </div>

        ${sprintActive ? `<div class="project-card-sprint"><i data-lucide="zap" width="12" height="12"></i> ${Utils.escapeHtml(sprintActive.name)}</div>` : ''}
      </div>
      <div class="project-card-footer">
        <div class="avatar-stack">${avatarStack}</div>
        <div class="project-card-meta">
          ${project.endDate ? `<span class="text-xs text-muted">${Utils.formatDate(project.endDate)}</span>` : ''}
          ${statusBadge}
        </div>
      </div>
    </div>`;
  }

  function _buildListTable(projects) {
    const users = Storage.get('sp_users') || [];
    const rows = projects.map(p => {
      const stats = Project.getStats(p.id);
      const owner = users.find(u => u.id === p.ownerId);
      const canEdit = _session.role === 'admin' || _session.role === 'pm';
      return `
      <tr class="project-row" data-id="${p.id}">
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:4px;height:28px;border-radius:2px;background:${p.color};flex-shrink:0;"></div>
            <div>
              <a class="text-sm fw-500" href="/pages/project-detail.html?id=${p.id}">${Utils.escapeHtml(p.name)}</a>
              <div class="text-xs text-muted">${Utils.escapeHtml(p.description || '—')}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-mono">${Utils.escapeHtml(p.key)}</span></td>
        <td>
          <div class="progress-bar" style="width:80px;">
            <div class="progress-fill" style="width:${stats.progress}%;background:${p.color};"></div>
          </div>
          <span class="text-xs text-muted">${stats.done}/${stats.total}</span>
        </td>
        <td><span class="text-sm">${p.memberIds.length}</span></td>
        <td>${owner ? `<span class="text-sm">${Utils.escapeHtml(owner.name)}</span>` : '—'}</td>
        <td>${p.endDate ? `<span class="text-sm">${Utils.formatDate(p.endDate)}</span>` : '—'}</td>
        <td>
          ${canEdit ? `
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon btn-sm btn-edit-project" data-id="${p.id}" title="Edit"><i data-lucide="edit-2" width="14" height="14"></i></button>
            <button class="btn btn-ghost btn-icon btn-sm btn-delete-project" data-id="${p.id}" title="Hapus" style="color:var(--color-danger);"><i data-lucide="trash-2" width="14" height="14"></i></button>
          </div>` : ''}
        </td>
      </tr>`;
    }).join('');

    return `
    <table class="data-table">
      <thead><tr>
        <th>Project</th><th>Key</th><th>Progress</th><th>Member</th><th>Owner</th><th>Deadline</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function _switchView() {
    const grid = document.getElementById('projects-grid');
    const list = document.getElementById('projects-list');
    if (_currentView === 'grid') {
      grid.classList.remove('hidden');
      list.classList.add('hidden');
    } else {
      grid.classList.add('hidden');
      list.classList.remove('hidden');
    }
  }

  function _bindCardEvents() {
    // Menu toggle
    document.querySelectorAll('.card-menu-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const dropdown = document.querySelector(`.card-menu-dropdown[data-id="${id}"]`);
        if (!dropdown) return;
        document.querySelectorAll('.card-menu-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
      });
    });

    document.querySelectorAll('.btn-edit-project').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        _openModal(btn.dataset.id);
      });
    });

    document.querySelectorAll('.btn-archive-project').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Project.archive(btn.dataset.id);
        App.Toast.success('Project diarsipkan');
        _render();
      });
    });

    document.querySelectorAll('.btn-unarchive-project').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Project.unarchive(btn.dataset.id);
        App.Toast.success('Project diaktifkan kembali');
        _render();
      });
    });

    document.querySelectorAll('.btn-delete-project').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const project = Project.getById(btn.dataset.id);
        if (!project) return;
        if (!confirm(`Hapus project "${project.name}"? Semua task, sprint, dan data terkait akan dihapus permanen.`)) return;
        Project.remove(btn.dataset.id);
        App.Toast.success('Project dihapus');
        _render();
      });
    });

    // Close menu on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.card-menu-dropdown').forEach(d => d.classList.add('hidden'));
    }, { capture: false });
  }

  function _openModal(editId) {
    _editingId = editId || null;
    const modal = document.getElementById('modal-project');
    const title = document.getElementById('modal-project-title');
    document.getElementById('project-form-error').classList.add('hidden');

    if (_editingId) {
      const p = Project.getById(_editingId);
      if (!p) return;
      title.textContent = 'Edit Project';
      document.getElementById('input-project-name').value = p.name;
      document.getElementById('input-project-key').value = p.key;
      document.getElementById('input-project-key').dataset.userModified = '1';
      document.getElementById('input-project-desc').value = p.description || '';
      document.getElementById('input-project-priority').value = p.priority;
      document.getElementById('input-project-start').value = p.startDate || '';
      document.getElementById('input-project-end').value = p.endDate || '';
      _selectedColor = p.color;
      document.getElementById('input-project-color').value = p.color;
      document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.color === p.color);
      });
    } else {
      title.textContent = 'New Project';
      document.getElementById('input-project-name').value = '';
      document.getElementById('input-project-key').value = '';
      delete document.getElementById('input-project-key').dataset.userModified;
      document.getElementById('input-project-desc').value = '';
      document.getElementById('input-project-priority').value = 'medium';
      document.getElementById('input-project-start').value = '';
      document.getElementById('input-project-end').value = '';
      _selectedColor = '#3B5BDB';
      document.getElementById('input-project-color').value = '#3B5BDB';
      document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.color === '#3B5BDB');
      });
    }

    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('input-project-name').focus(), 50);
    if (window.lucide) lucide.createIcons();
  }

  function _closeModal() {
    document.getElementById('modal-project').classList.add('hidden');
    _editingId = null;
  }

  function _save() {
    const name = document.getElementById('input-project-name').value.trim();
    const key = document.getElementById('input-project-key').value.trim().toUpperCase();
    const desc = document.getElementById('input-project-desc').value.trim();
    const priority = document.getElementById('input-project-priority').value;
    const startDate = document.getElementById('input-project-start').value;
    const endDate = document.getElementById('input-project-end').value;
    const errEl = document.getElementById('project-form-error');

    errEl.classList.add('hidden');

    if (!name) { _showError('Nama project wajib diisi.'); return; }
    if (!key || key.length < 2 || key.length > 5) { _showError('Key harus 2–5 huruf kapital.'); return; }
    if (!/^[A-Z]+$/.test(key)) { _showError('Key hanya boleh mengandung huruf A–Z.'); return; }

    const data = { name, key, description: desc, priority, color: _selectedColor, startDate: startDate || null, endDate: endDate || null };

    let result;
    if (_editingId) {
      result = Project.update(_editingId, data);
    } else {
      result = Project.create(data);
    }

    if (result && result.error) {
      if (result.error === 'key_exists') _showError(`Key "${key}" sudah digunakan project lain.`);
      else if (result.error === 'name_exists') _showError(`Nama "${name}" sudah digunakan project lain.`);
      else _showError('Gagal menyimpan project.');
      return;
    }

    _closeModal();
    App.Toast.success(_editingId ? 'Project diperbarui' : 'Project berhasil dibuat');
    _render();
  }

  function _showError(msg) {
    const el = document.getElementById('project-form-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  return { init };
})();
